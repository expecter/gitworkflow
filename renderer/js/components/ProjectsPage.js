/**
 * 项目页面组件
 */

const React = require('react');
const { useState, useEffect } = React;
const gitlabService = require('../services/gitlab-service');
const workspaceService = require('../services/workspace-service');

function ProjectsPage({ user, showNotification }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [mergeRequests, setMergeRequests] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cloneLoading, setCloneLoading] = useState(false);
  const [workspaceDirectories, setWorkspaceDirectories] = useState([]);
  const [selectedDirectory, setSelectedDirectory] = useState('');
  
  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const projectsList = await gitlabService.getProjects();
        setProjects(projectsList);
        
        if (projectsList.length > 0 && !selectedProject) {
          setSelectedProject(projectsList[0]);
        }
      } catch (error) {
        console.error('加载项目列表失败:', error);
        showNotification('加载项目列表失败: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadProjects();
  }, [showNotification, selectedProject]);
  
  // 加载工作空间目录
  useEffect(() => {
    const loadDirectories = async () => {
      try {
        const dirs = await workspaceService.getDirectories();
        setWorkspaceDirectories(dirs || []);
        
        if (dirs && dirs.length > 0) {
          setSelectedDirectory(dirs[0]);
        }
      } catch (error) {
        console.error('加载工作空间目录失败:', error);
      }
    };
    
    loadDirectories();
  }, []);
  
  // 加载项目详情
  useEffect(() => {
    const loadProjectDetails = async () => {
      if (!selectedProject) {
        setProjectDetails(null);
        setMergeRequests([]);
        setIssues([]);
        return;
      }
      
      try {
        setLoading(true);
        
        // 获取项目详情
        const details = await gitlabService.getProject(selectedProject.id);
        setProjectDetails(details);
        
        // 获取合并请求
        const mrs = await gitlabService.getMergeRequests(selectedProject.id);
        setMergeRequests(mrs);
        
        // 获取问题
        const projectIssues = await gitlabService.getIssues(selectedProject.id);
        setIssues(projectIssues);
      } catch (error) {
        console.error('加载项目详情失败:', error);
        showNotification('加载项目详情失败: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadProjectDetails();
  }, [selectedProject, showNotification]);
  
  // 处理项目选择
  const handleProjectSelect = (project) => {
    setSelectedProject(project);
  };
  
  // 处理搜索
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // 过滤项目
  const filteredProjects = projects.filter(project => {
    return project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           project.path_with_namespace.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  // 处理克隆项目
  const handleClone = async () => {
    if (!selectedProject || !selectedDirectory) {
      showNotification('请选择项目和工作空间目录', 'error');
      return;
    }
    
    setCloneLoading(true);
    
    try {
      const targetPath = `${selectedDirectory}/${selectedProject.name}`;
      await workspaceService.cloneRepository(selectedProject.http_url_to_repo, targetPath);
      showNotification(`项目已成功克隆到 ${targetPath}`);
    } catch (error) {
      console.error('克隆项目失败:', error);
      showNotification('克隆项目失败: ' + error.message, 'error');
    } finally {
      setCloneLoading(false);
    }
  };
  
  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { className: "page-header" },
      React.createElement('h2', { className: "page-title" }, 'GitLab项目'),
      React.createElement(
        'div',
        { className: "search-container" },
        React.createElement('input', {
          type: "text",
          className: "search-input",
          placeholder: "搜索项目...",
          value: searchQuery,
          onChange: handleSearch
        })
      )
    ),
    
    loading && !selectedProject ?
      React.createElement('div', { className: "loading-state" }, '加载项目中...') :
      projects.length === 0 ?
        React.createElement(
          'div',
          { className: "empty-state" },
          React.createElement('p', null, '没有找到任何项目。'),
          React.createElement('p', null, '请确保您的GitLab访问令牌具有足够的权限。')
        ) :
        React.createElement(
          'div',
          { className: "projects-container" },
          React.createElement(
            'div',
            { className: "projects-list" },
            filteredProjects.map(project => 
              React.createElement(
                'div',
                {
                  key: project.id,
                  className: `project-card ${selectedProject && selectedProject.id === project.id ? 'selected' : ''}`,
                  onClick: () => handleProjectSelect(project)
                },
                React.createElement(
                  'div',
                  { className: "project-avatar" },
                  project.avatar_url ?
                    React.createElement('img', { src: project.avatar_url, alt: project.name }) :
                    React.createElement(
                      'div',
                      { className: "project-avatar-placeholder" },
                      project.name.charAt(0).toUpperCase()
                    )
                ),
                React.createElement(
                  'div',
                  { className: "project-info" },
                  React.createElement('h4', { className: "project-name" }, project.name),
                  React.createElement('p', { className: "project-path" }, project.path_with_namespace)
                )
              )
            )
          ),
          
          React.createElement(
            'div',
            { className: "project-details" },
            loading ?
              React.createElement('div', { className: "loading-state" }, '加载项目详情中...') :
              !projectDetails ?
                React.createElement('div', { className: "empty-state" }, '请选择一个项目查看详情') :
                React.createElement(
                  'div',
                  null,
                  React.createElement('h3', null, projectDetails.name),
                  
                  React.createElement(
                    'p',
                    { className: "project-description" },
                    projectDetails.description || '无项目描述'
                  ),
                  
                  React.createElement(
                    'div',
                    { className: "project-meta" },
                    React.createElement(
                      'div',
                      { className: "meta-item" },
                      React.createElement('span', { className: "meta-label" }, '创建时间'),
                      React.createElement('span', { className: "meta-value" }, new Date(projectDetails.created_at).toLocaleString())
                    ),
                    
                    React.createElement(
                      'div',
                      { className: "meta-item" },
                      React.createElement('span', { className: "meta-label" }, '最后活动'),
                      React.createElement('span', { className: "meta-value" }, new Date(projectDetails.last_activity_at).toLocaleString())
                    ),
                    
                    React.createElement(
                      'div',
                      { className: "meta-item" },
                      React.createElement('span', { className: "meta-label" }, '默认分支'),
                      React.createElement('span', { className: "meta-value" }, projectDetails.default_branch)
                    ),
                    
                    React.createElement(
                      'div',
                      { className: "meta-item" },
                      React.createElement('span', { className: "meta-label" }, '可见性'),
                      React.createElement('span', { className: "meta-value" }, projectDetails.visibility)
                    ),
                    
                    React.createElement(
                      'div',
                      { className: "meta-item" },
                      React.createElement('span', { className: "meta-label" }, '星标数'),
                      React.createElement('span', { className: "meta-value" }, projectDetails.star_count)
                    ),
                    
                    React.createElement(
                      'div',
                      { className: "meta-item" },
                      React.createElement('span', { className: "meta-label" }, 'Fork数'),
                      React.createElement('span', { className: "meta-value" }, projectDetails.forks_count)
                    )
                  ),
                  
                  React.createElement(
                    'div',
                    { className: "clone-container" },
                    React.createElement('h4', null, '克隆到本地工作空间'),
                    
                    workspaceDirectories.length === 0 ?
                      React.createElement(
                        'div',
                        { className: "empty-state" },
                        React.createElement('p', null, '没有可用的工作空间目录。请在设置中添加工作空间目录。')
                      ) :
                      React.createElement(
                        'div',
                        null,
                        React.createElement(
                          'div',
                          { className: "form-group" },
                          React.createElement('label', { className: "form-label" }, '选择工作空间目录'),
                          React.createElement(
                            'select',
                            {
                              className: "form-control",
                              value: selectedDirectory,
                              onChange: (e) => setSelectedDirectory(e.target.value),
                              disabled: cloneLoading
                            },
                            workspaceDirectories.map((dir, index) =>
                              React.createElement('option', { key: index, value: dir }, dir)
                            )
                          )
                        ),
                        
                        React.createElement(
                          'div',
                          { className: "form-group" },
                          React.createElement('label', { className: "form-label" }, '克隆URL'),
                          React.createElement('input', {
                            type: "text",
                            className: "form-control",
                            value: projectDetails.http_url_to_repo,
                            readOnly: true
                          })
                        ),
                        
                        React.createElement(
                          'button',
                          {
                            className: "btn btn-primary",
                            onClick: handleClone,
                            disabled: cloneLoading
                          },
                          cloneLoading ? '克隆中...' : '克隆项目'
                        )
                      )
                  ),
                  
                  mergeRequests.length > 0 &&
                    React.createElement(
                      'div',
                      { className: "card mt-4" },
                      React.createElement(
                        'div',
                        { className: "card-header" },
                        React.createElement('h3', { className: "card-title" }, `开放的合并请求 (${mergeRequests.length})`)
                      ),
                      React.createElement(
                        'div',
                        { className: "card-body" },
                        React.createElement(
                          'ul',
                          { className: "list-group" },
                          mergeRequests.slice(0, 5).map(mr =>
                            React.createElement(
                              'li',
                              { key: mr.id, className: "list-group-item" },
                              React.createElement(
                                'a',
                                { href: mr.web_url, target: "_blank", rel: "noopener noreferrer" },
                                mr.title
                              ),
                              React.createElement(
                                'div',
                                { className: "text-muted small" },
                                `由 ${mr.author.name} 创建于 ${new Date(mr.created_at).toLocaleString()}`
                              )
                            )
                          )
                        )
                      )
                    ),
                  
                  issues.length > 0 &&
                    React.createElement(
                      'div',
                      { className: "card mt-4" },
                      React.createElement(
                        'div',
                        { className: "card-header" },
                        React.createElement('h3', { className: "card-title" }, `开放的问题 (${issues.length})`)
                      ),
                      React.createElement(
                        'div',
                        { className: "card-body" },
                        React.createElement(
                          'ul',
                          { className: "list-group" },
                          issues.slice(0, 5).map(issue =>
                            React.createElement(
                              'li',
                              { key: issue.id, className: "list-group-item" },
                              React.createElement(
                                'a',
                                { href: issue.web_url, target: "_blank", rel: "noopener noreferrer" },
                                issue.title
                              ),
                              React.createElement(
                                'div',
                                { className: "text-muted small" },
                                `由 ${issue.author.name} 创建于 ${new Date(issue.created_at).toLocaleString()}`
                              )
                            )
                          )
                        )
                      )
                    )
                )
          )
        )
  );
}

module.exports = ProjectsPage;