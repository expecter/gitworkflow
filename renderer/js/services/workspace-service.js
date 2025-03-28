/**
 * 工作空间服务
 * 负责管理本地工作空间和Git仓库
 */

const { ipcRenderer } = require('electron');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

/**
 * 工作空间服务类
 */
class WorkspaceService {
  /**
   * 获取工作空间目录列表
   */
  async getDirectories() {
    return ipcRenderer.invoke('workspace:getDirectories');
  }

  /**
   * 添加工作空间目录
   */
  async addDirectory() {
    return ipcRenderer.invoke('workspace:addDirectory');
  }

  /**
   * 移除工作空间目录
   */
  async removeDirectory(dirPath) {
    return ipcRenderer.invoke('workspace:removeDirectory', dirPath);
  }

  /**
   * 获取目录内容
   */
  async getDirectoryContents(dirPath) {
    return ipcRenderer.invoke('workspace:getDirectoryContents', dirPath);
  }

  /**
   * 获取Git仓库状态
   */
  async getRepositoryStatus(repoPath) {
    try {
      const git = simpleGit(repoPath);
      
      // 获取当前分支
      const branchSummary = await git.branch();
      const currentBranch = branchSummary.current;
      
      // 获取所有分支
      const branches = branchSummary.all;
      
      // 获取状态
      const status = await git.status();
      
      // 获取远程分支信息
      let ahead = 0;
      let behind = 0;
      
      try {
        // 先尝试获取远程信息
        await git.fetch();
        
        // 获取本地与远程的差异
        const upstream = await git.revparse(['--abbrev-ref', `${currentBranch}@{upstream}`]);
        if (upstream) {
          const revs = await git.raw(['rev-list', '--left-right', '--count', `${currentBranch}...${upstream}`]);
          const counts = revs.trim().split('\t');
          ahead = parseInt(counts[0], 10) || 0;
          behind = parseInt(counts[1], 10) || 0;
        }
      } catch (error) {
        console.log('获取远程分支信息失败，可能是新仓库或无远程分支', error);
      }
      
      return {
        currentBranch,
        branches,
        isClean: status.isClean(),
        ahead,
        behind,
        modified: status.modified,
        created: status.created,
        deleted: status.deleted,
        renamed: status.renamed,
        staged: status.staged
      };
    } catch (error) {
      console.error('获取仓库状态失败:', error);
      throw error;
    }
  }

  /**
   * 拉取代码
   */
  async pullRepository(repoPath, branch) {
    try {
      const git = simpleGit(repoPath);
      return await git.pull('origin', branch);
    } catch (error) {
      console.error('拉取代码失败:', error);
      throw error;
    }
  }

  /**
   * 推送代码
   */
  async pushRepository(repoPath, branch) {
    try {
      const git = simpleGit(repoPath);
      return await git.push('origin', branch);
    } catch (error) {
      console.error('推送代码失败:', error);
      throw error;
    }
  }

  /**
   * 切换分支
   */
  async checkoutBranch(repoPath, branch) {
    try {
      const git = simpleGit(repoPath);
      return await git.checkout(branch);
    } catch (error) {
      console.error('切换分支失败:', error);
      throw error;
    }
  }

  /**
   * 克隆仓库
   */
  async cloneRepository(url, targetPath) {
    try {
      const git = simpleGit();
      return await git.clone(url, targetPath);
    } catch (error) {
      console.error('克隆仓库失败:', error);
      throw error;
    }
  }

  /**
   * 获取Git仓库的远程URL
   */
  async getRepositoryRemoteUrl(repoPath) {
    try {
      const git = simpleGit(repoPath);
      const remotes = await git.getRemotes(true);
      
      // 优先查找origin远程仓库
      const origin = remotes.find(remote => remote.name === 'origin');
      if (origin && origin.refs && origin.refs.fetch) {
        return origin.refs.fetch;
      }
      
      // 如果没有origin，返回第一个远程仓库的URL
      if (remotes.length > 0 && remotes[0].refs && remotes[0].refs.fetch) {
        return remotes[0].refs.fetch;
      }
      
      return null;
    } catch (error) {
      console.error('获取仓库远程URL失败:', error);
      return null;
    }
  }

  /**
   * 扫描工作空间目录中的所有Git仓库
   */
  async scanWorkspaceRepositories(directories) {
    try {
      const repositories = [];
      const readdir = promisify(fs.readdir);
      const stat = promisify(fs.stat);
      const exists = promisify(fs.exists);
      
      // 遍历所有工作空间目录
      for (const dir of directories) {
        try {
          // 获取目录中的所有子目录
          const items = await readdir(dir);
          
          // 遍历子目录，查找Git仓库
          for (const item of items) {
            const itemPath = path.join(dir, item);
            
            try {
              const itemStat = await stat(itemPath);
              
              // 只处理目录
              if (itemStat.isDirectory()) {
                // 检查是否为Git仓库
                const gitDirPath = path.join(itemPath, '.git');
                const isGitRepo = await exists(gitDirPath);
                
                if (isGitRepo) {
                  // 获取仓库远程URL
                  const remoteUrl = await this.getRepositoryRemoteUrl(itemPath);
                  
                  repositories.push({
                    name: item,
                    path: itemPath,
                    isGitRepository: true,
                    remoteUrl
                  });
                }
              }
            } catch (itemError) {
              console.error(`处理目录项失败 (${itemPath}):`, itemError);
            }
          }
        } catch (dirError) {
          console.error(`扫描目录失败 (${dir}):`, dirError);
        }
      }
      
      return repositories;
    } catch (error) {
      console.error('扫描工作空间仓库失败:', error);
      throw error;
    }
  }
}

module.exports = new WorkspaceService();