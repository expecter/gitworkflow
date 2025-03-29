/**
 * GitLab服务
 * 负责与GitLab API交互
 */

const axios = require('axios');
const { ipcRenderer } = require('electron');

/**
 * GitLab服务类
 */
class GitLabService {
  /**
   * 检查GitLab配置是否已完成
   * @returns {Promise<boolean>} 配置是否已完成
   */
  async isConfigured() {
    try {
      const token = await this.getToken();
      const baseUrl = await this.getBaseUrl();
      return !!(token && baseUrl);
    } catch (error) {
      console.error('检查GitLab配置失败:', error);
      return false;
    }
  }
  /**
   * 获取GitLab访问令牌
   */
  async getToken() {
    return ipcRenderer.invoke('gitlab:getToken');
  }

  /**
   * 设置GitLab访问令牌
   */
  async setToken(token) {
    return ipcRenderer.invoke('gitlab:setToken', token);
  }

  /**
   * 获取GitLab基础URL
   */
  async getBaseUrl() {
    return ipcRenderer.invoke('gitlab:getBaseUrl');
  }

  /**
   * 设置GitLab基础URL
   */
  async setBaseUrl(url) {
    return ipcRenderer.invoke('gitlab:setBaseUrl', url);
  }

  /**
   * 创建API请求实例
   */
  async createApiInstance() {
    const token = await this.getToken();
    const baseUrl = await this.getBaseUrl();
    
    return axios.create({
      baseURL: `${baseUrl}/api/v4`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser() {
    const api = await this.createApiInstance();
    const response = await api.get('/user');
    return response.data;
  }

  /**
   * 获取用户项目列表
   */
  async getProjects(params = {}) {
    const api = await this.createApiInstance();
    const response = await api.get('/projects', { params: {
      membership: true,
      order_by: 'updated_at',
      sort: 'desc',
      ...params
    }});
    return response.data;
  }

  /**
   * 获取项目详情
   */
  async getProject(projectId) {
    const api = await this.createApiInstance();
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  }

  /**
   * 获取项目合并请求列表
   */
  async getMergeRequests(projectId, params = {}) {
    const api = await this.createApiInstance();
    const response = await api.get(`/projects/${projectId}/merge_requests`, {
      params: {
        state: 'opened',
        order_by: 'updated_at',
        sort: 'desc',
        ...params
      }
    });
    return response.data;
  }

  /**
   * 获取项目问题列表
   */
  async getIssues(projectId, params = {}) {
    const api = await this.createApiInstance();
    const response = await api.get(`/projects/${projectId}/issues`, {
      params: {
        state: 'opened',
        order_by: 'updated_at',
        sort: 'desc',
        ...params
      }
    });
    return response.data;
  }

  /**
   * 获取项目分支列表
   */
  async getBranches(projectId) {
    const api = await this.createApiInstance();
    const response = await api.get(`/projects/${projectId}/repository/branches`);
    return response.data;
  }

  /**
   * 通过远程URL匹配GitLab项目
   * @param {string} remoteUrl Git仓库的远程URL
   * @returns {Promise<Object|null>} 匹配的GitLab项目，如果没有匹配则返回null
   */
  async matchProjectByRemoteUrl(remoteUrl) {
    try {
      if (!remoteUrl) return null;
      
      // 获取所有项目
      const projects = await this.getProjects({ per_page: 100 });
      if (!projects || projects.length === 0) return null;
      
      // 标准化远程URL
      const normalizedRemoteUrl = this.normalizeGitUrl(remoteUrl);
      
      // 尝试通过不同方式匹配项目
      
      // 1. 直接匹配HTTP URL或SSH URL
      let matchedProject = projects.find(project => {
        const httpUrlMatched = project.http_url_to_repo && 
                              this.normalizeGitUrl(project.http_url_to_repo) === normalizedRemoteUrl;
        const sshUrlMatched = project.ssh_url_to_repo && 
                             this.normalizeGitUrl(project.ssh_url_to_repo) === normalizedRemoteUrl;
        return httpUrlMatched || sshUrlMatched;
      });
      
      if (matchedProject) return matchedProject;
      
      // 2. 尝试匹配项目路径部分
      const remotePathSegment = this.extractProjectPathFromUrl(normalizedRemoteUrl);
      if (remotePathSegment) {
        matchedProject = projects.find(project => {
          const projectPath = project.path_with_namespace;
          return projectPath && projectPath.toLowerCase() === remotePathSegment.toLowerCase();
        });
        
        if (matchedProject) return matchedProject;
      }
      
      // 3. 尝试匹配项目名称部分
      const projectName = this.extractProjectNameFromUrl(normalizedRemoteUrl);
      if (projectName) {
        matchedProject = projects.find(project => 
          project.name && project.name.toLowerCase() === projectName.toLowerCase()
        );
        
        if (matchedProject) return matchedProject;
      }
      
      return null;
    } catch (error) {
      console.error('通过远程URL匹配GitLab项目失败:', error);
      return null;
    }
  }
  
  /**
   * 标准化Git URL
   * @param {string} url Git URL
   * @returns {string} 标准化后的URL
   */
  normalizeGitUrl(url) {
    if (!url) return '';
    
    // 移除URL末尾的.git后缀
    let normalizedUrl = url.trim();
    if (normalizedUrl.endsWith('.git')) {
      normalizedUrl = normalizedUrl.slice(0, -4);
    }
    
    // 移除URL末尾的斜杠
    if (normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.slice(0, -1);
    }
    
    return normalizedUrl.toLowerCase();
  }
  
  /**
   * 从URL中提取项目路径
   * @param {string} url Git URL
   * @returns {string|null} 项目路径
   */
  extractProjectPathFromUrl(url) {
    if (!url) return null;
    
    try {
      // 处理HTTP(S) URL
      if (url.startsWith('http')) {
        const urlObj = new URL(url);
        // 移除开头的斜杠
        return urlObj.pathname.replace(/^\//, '');
      }
      
      // 处理SSH URL (格式: git@hostname:path/to/repo.git)
      if (url.includes('@')) {
        const match = url.match(/@[^:]+:(.+)/);
        return match && match[1] ? match[1] : null;
      }
    } catch (error) {
      console.error('从URL提取项目路径失败:', error);
    }
    
    return null;
  }
  
  /**
   * 从URL中提取项目名称
   * @param {string} url Git URL
   * @returns {string|null} 项目名称
   */
  extractProjectNameFromUrl(url) {
    if (!url) return null;
    
    try {
      const path = this.extractProjectPathFromUrl(url);
      if (!path) return null;
      
      // 获取路径的最后一部分作为项目名称
      const segments = path.split('/');
      return segments[segments.length - 1];
    } catch (error) {
      console.error('从URL提取项目名称失败:', error);
    }
    
    return null;
  }
}

module.exports = new GitLabService();