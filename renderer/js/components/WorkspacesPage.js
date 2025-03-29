/**
 * 工作空间页面组件
 */

const React = require('react');
const { useState, useEffect } = React;
const { ipcRenderer } = require('electron');
const workspaceService = require('../services/workspace-service');
const gitlabService = require('../services/gitlab-service');

function WorkspacesPage({ user, showNotification }) {
  const [directories, setDirectories] = useState([]);
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  const [directoryContents, setDirectoryContents] = useState([]);
  const [selectedRepository, setSelectedRepository] = useState(null);
  const [repositoryStatus, setRepositoryStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [repositories, setRepositories] = useState([]);
  const [gitlabProjects, setGitlabProjects] = useState([]);
  const [scanningRepos, setScanningRepos] = useState(false);
  
  // 加载工作空间目录
  useEffect(() => {
    const loadDirectories = async () => {
      try {
        const dirs = await workspaceService.getDirectories();
        setDirectories(dirs || []);
        
        if (dirs && dirs.length > 0 && !selectedDirectory) {
          setSelectedDirectory(dirs[0]);
        }
      } catch (error) {
        console.error('加载工作空间目录失败:', error);
        showNotification('加载工作空间目录失败', 'error');
      }
    };
    
    loadDirectories();
  }, [showNotification, selectedDirectory]);
  
  // 加载目录内容
  useEffect(() => {
    const loadDirectoryContents = async () => {
      if (!selectedDirectory) return;
      
      try {
        setLoading(true);
        const contents = await workspaceService.getDirectoryContents(selectedDirectory);
        setDirectoryContents(contents);
      } catch (error) {
        console.error(`加载目录内容失败 (${selectedDirectory}):`, error);
        showNotification(`加载目录内容失败: ${error.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadDirectoryContents();
  }, [selectedDirectory, showNotification]);
  
  // 加载仓库状态
  useEffect(() => {
    const loadRepositoryStatus = async () => {
      if (!selectedRepository) {
        setRepositoryStatus(null);
        return;
      }
      
      try {
        const status = await workspaceService.getRepositoryStatus(selectedRepository.path);
        setRepositoryStatus(status);
      } catch (error) {
        console.error(`加载仓库状态失败 (${selectedRepository.path}):`, error);
        showNotification(`加载仓库状态失败: ${error.message}`, 'error');
      }
    };
    
    loadRepositoryStatus();
  }, [selectedRepository, showNotification]);
  
  // 处理目录选择
  const handleDirectorySelect = (dirPath) => {
    setSelectedDirectory(dirPath);
    setSelectedRepository(null);
  };
  
  // 处理仓库选择
  const handleRepositorySelect = (repo) => {
    setSelectedRepository(repo);
  };
  
  // 处理拉取代码
  const handlePull = async () => {
    if (!selectedRepository || !repositoryStatus) return;
    
    setActionLoading(true);
    
    try {
      await workspaceService.pullRepository(
        selectedRepository.path, 
        repositoryStatus.currentBranch
      );
      
      // 重新加载仓库状态
      const status = await workspaceService.getRepositoryStatus(selectedRepository.path);
      setRepositoryStatus(status);
      
      showNotification(`已成功拉取最新代码`);
    } catch (error) {
      console.error(`拉取代码失败:`, error);
      showNotification(`拉取代码失败: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };
  
  // 处理推送代码
  const handlePush = async () => {
    if (!selectedRepository || !repositoryStatus) return;
    
    setActionLoading(true);
    
    try {
      await workspaceService.pushRepository(
        selectedRepository.path, 
        repositoryStatus.currentBranch
      );
      
      // 重新加载仓库状态
      const status = await workspaceService.getRepositoryStatus(selectedRepository.path);
      setRepositoryStatus(status);
      
      showNotification(`已成功推送代码`);
    } catch (error) {
      console.error(`推送代码失败:`, error);
      showNotification(`推送代码失败: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };
  
  // 处理分支切换
  const handleBranchChange = async (branchName) => {
    if (!selectedRepository) return;
    
    setActionLoading(true);
    
    try {
      await workspaceService.checkoutBranch(selectedRepository.path, branchName);
      
      // 重新加载仓库状态
      const status = await workspaceService.getRepositoryStatus(selectedRepository.path);
      setRepositoryStatus(status);
      
      showNotification(`已切换到分支: ${branchName}`);
    } catch (error) {
      console.error(`切换分支失败:`, error);
      showNotification(`切换分支失败: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };
  
  // 扫描所有工作空间目录中的Git仓库
  const handleScanRepositories = async () => {
    try {
      setScanningRepos(true);
      showNotification('正在扫描工作空间中的Git仓库...');
      
      // 获取所有工作空间目录
      const dirs = await workspaceService.getDirectories();
      if (!dirs || dirs.length === 0) {
        showNotification('没有可用的工作空间目录', 'warning');
        setScanningRepos(false);
        return;
      }
      
      // 扫描所有目录中的Git仓库
      const repos = await workspaceService.scanWorkspaceRepositories(dirs);
      setRepositories(repos);
      
      // 获取GitLab项目列表
      const projects = await gitlabService.getProjects({ per_page: 100 });
      setGitlabProjects(projects);
      
      // 尝试匹配仓库和GitLab项目
      const matchedRepos = [];
      for (const repo of repos) {
        if (repo.remoteUrl) {
          try {
            const matchedProject = await gitlabService.matchProjectByRemoteUrl(repo.remoteUrl);
            if (matchedProject) {
              matchedRepos.push({
                ...repo,
                gitlabProjectId: matchedProject.id,
                gitlabProject: matchedProject
              });
            } else {
              matchedRepos.push(repo);
            }
          } catch (error) {
            console.error(`匹配仓库${repo.path}失败:`, error);
            matchedRepos.push(repo);
          }
        } else {
          matchedRepos.push(repo);
        }
      }
      
      setRepositories(matchedRepos);
      showNotification(`扫描完成，发现 ${repos.length} 个Git仓库`);
    } catch (error) {
      console.error('扫描仓库失败:', error);
      showNotification(`扫描仓库失败: ${error.message}`, 'error');
    } finally {
      setScanningRepos(false);
    }
  };
  
  // 手动绑定仓库与GitLab项目
  const handleBindRepository = async (repo, projectId) => {
    try {
      if (!projectId) {
        showNotification('请选择要绑定的GitLab项目', 'warning');
        return;
      }
      
      const updatedRepos = repositories.map(r => {
        if (r.path === repo.path) {
          const gitlabProject = gitlabProjects.find(p => p.id === parseInt(projectId));
          return {
            ...r,
            gitlabProjectId: parseInt(projectId),
            gitlabProject
          };
        }
        return r;
      });
      
      setRepositories(updatedRepos);
      showNotification('已成功绑定仓库与GitLab项目');
    } catch (error) {
      console.error('绑定仓库失败:', error);
      showNotification(`绑定仓库失败: ${error.message}`, 'error');
    }
  };
  
  // 过滤出当前目录的Git仓库
  const currentDirectoryRepositories = directoryContents.filter(item => item.isGitRepository);
  
  return React.createElement(
    'div',
    { className: "workspaces-page" },
    React.createElement(
      'div',
      { className: "page-header" },
      React.createElement('h2', { className: "page-title" }, '工作空间'),
      React.createElement(
        'div',
        { className: "page-actions" },
        React.createElement(
          'button',
          {
            className: "btn btn-primary",
            onClick: handleScanRepositories,
            disabled: scanningRepos
          },
          scanningRepos ? '扫描中...' : '扫描Git仓库并绑定GitLab'
        )
      )
    ),
    
    directories.length === 0 ?
      React.createElement(
        'div',
        { className: "empty-state" },
        React.createElement('p', null, '没有可用的工作空间目录。请在设置中添加工作空间目录。')
      ) :
      React.createElement(
        'div',
        { className: "workspace-container" },
        React.createElement(
          'div',
          { className: "workspace-sidebar" },
          React.createElement('h3', null, '工作空间目录'),
          React.createElement(
            'ul',
            { className: "directory-list" },
            directories.map((dir, index) => 
              React.createElement(
                'li',
                {
                  key: index,
                  className: `directory-item ${selectedDirectory === dir ? 'active' : ''}`,
                  onClick: () => handleDirectorySelect(dir)
                },
                React.createElement('span', { className: "directory-icon icon-folder" }),
                React.createElement('span', { className: "directory-name" }, dir)
              )
            )
          )
        ),
        
        React.createElement(
          'div',
          { className: "workspace-content" },
          loading ?
            React.createElement('div', { className: "loading-state" }, '加载中...') :
            repositories.length === 0 ?
              React.createElement(
                'div',
                { className: "empty-state" },
                React.createElement('p', null, '所选目录中没有Git仓库。'),
                React.createElement('p', null, '您可以从GitLab项目页面克隆项目到此目录。')
              ) :
              React.createElement(
                'div',
                { className: "repositories-container" },
                React.createElement('h3', null, 'Git仓库'),
                React.createElement(
                  'div',
                  { className: "repositories-grid" },
                  currentDirectoryRepositories.map((repo, index) => {
                    // 查找完整仓库信息（包括GitLab绑定信息）
                    const fullRepo = repositories.find(r => r.path === repo.path) || repo;
                    
                    return React.createElement(
                      'div',
                      {
                        key: index,
                        className: `repository-card ${selectedRepository && selectedRepository.path === repo.path ? 'selected' : ''}`,
                        onClick: () => handleRepositorySelect(fullRepo)
                      },
                      React.createElement('div', { className: "repository-name" }, repo.name),
                      fullRepo.gitlabProjectId && fullRepo.gitlabProject ?
                        React.createElement(
                          'div',
                          { className: "repository-gitlab-info" },
                          React.createElement('span', { className: "gitlab-badge" }, 'GitLab'),
                          React.createElement('span', { className: "gitlab-project-name" }, fullRepo.gitlabProject.name)
                        ) :
                        React.createElement(
                          'div',
                          { className: "repository-gitlab-info not-linked" },
                          React.createElement('span', { className: "gitlab-badge" }, '未绑定GitLab')
                        )
                    );
                  })
                ),
                
                selectedRepository && repositoryStatus &&
                  React.createElement(
                    'div',
                    { className: "repository-details" },
                    React.createElement('h4', null, selectedRepository.name),
                    
                    React.createElement(
                      'div',
                      { className: "repository-info" },
                      React.createElement(
                        'div',
                        { className: "info-item" },
                        React.createElement('span', { className: "info-label" }, '当前分支:'),
                        React.createElement('span', { className: "info-value" }, repositoryStatus.currentBranch)
                      ),
                      
                      React.createElement(
                        'div',
                        { className: "info-item" },
                        React.createElement('span', { className: "info-label" }, '远程分支:'),
                        React.createElement(
                          'select',
                          {
                            className: "branch-select",
                            value: repositoryStatus.currentBranch,
                            onChange: (e) => handleBranchChange(e.target.value),
                            disabled: actionLoading
                          },
                          repositoryStatus.branches.map((branch, idx) =>
                            React.createElement('option', { key: idx, value: branch }, branch)
                          )
                        )
                      ),
                      
                      React.createElement(
                        'div',
                        { className: "info-item" },
                        React.createElement('span', { className: "info-label" }, '状态:'),
                        React.createElement(
                          'span',
                          { className: "info-value" },
                          repositoryStatus.isClean ? '无更改' : '有未提交更改'
                        )
                      ),
                      
                      repositoryStatus.ahead > 0 &&
                        React.createElement(
                          'div',
                          { className: "info-item" },
                          React.createElement(
                            'span',
                            { className: "info-value warning" },
                            `本地领先远程 ${repositoryStatus.ahead} 个提交`
                          )
                        ),
                      
                      repositoryStatus.behind > 0 &&
                        React.createElement(
                          'div',
                          { className: "info-item" },
                          React.createElement(
                            'span',
                            { className: "info-value warning" },
                            `本地落后远程 ${repositoryStatus.behind} 个提交`
                          )
                        )
                    ),
                    
                    React.createElement(
                      'div',
                      { className: "repository-actions" },
                      React.createElement(
                        'button',
                        {
                          className: "btn btn-primary",
                          onClick: handlePull,
                          disabled: actionLoading
                        },
                        actionLoading ? '操作中...' : '拉取'
                      ),
                      
                      React.createElement(
                        'button',
                        {
                          className: "btn btn-primary",
                          onClick: handlePush,
                          disabled: actionLoading || repositoryStatus.ahead === 0
                        },
                        actionLoading ? '操作中...' : '推送'
                      ),
                      
                      React.createElement(
                        'button',
                        {
                          className: "btn btn-secondary",
                          onClick: () => ipcRenderer.invoke('workspace:openInExplorer', selectedRepository.path)
                        },
                        '在文件管理器中打开'
                      )
                    ),
                    
                    // GitLab项目绑定部分
                    React.createElement(
                      'div',
                      { className: "repository-gitlab-binding" },
                      React.createElement('h4', null, 'GitLab项目绑定'),
                      
                      selectedRepository.gitlabProjectId && selectedRepository.gitlabProject ?
                        React.createElement(
                          'div',
                          { className: "gitlab-project-info" },
                          React.createElement('p', null, `已绑定到GitLab项目: ${selectedRepository.gitlabProject.name}`),
                          React.createElement(
                            'a',
                            {
                              href: selectedRepository.gitlabProject.web_url,
                              target: "_blank",
                              className: "btn btn-sm btn-info"
                            },
                            '在GitLab中查看'
                          )
                        ) :
                        React.createElement(
                          'div',
                          null,
                          React.createElement('p', null, '此仓库尚未绑定到GitLab项目'),
                          gitlabProjects && gitlabProjects.length > 0 ?
                            React.createElement(
                              'div',
                              { className: "gitlab-project-selector" },
                              React.createElement(
                                'select',
                                {
                                  className: "form-control",
                                  onChange: (e) => handleBindRepository(selectedRepository, e.target.value),
                                  defaultValue: ""
                                },
                                React.createElement('option', { value: "" }, '选择要绑定的GitLab项目...'),
                                gitlabProjects.map((project, idx) =>
                                  React.createElement('option', { key: idx, value: project.id }, project.name_with_namespace)
                                )
                              )
                            ) :
                            React.createElement('p', { className: "text-muted" }, '没有可用的GitLab项目')
                        )
                    )
                  )
              )
            )
          )
        )
}

module.exports = WorkspacesPage;