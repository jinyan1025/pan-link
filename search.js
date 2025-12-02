// ============ LeanCloud 配置 ============
const LEANCLOUD_CONFIG = {
  appId: '6bijC37wqZ7WEYHldHo2uug4-gzGzoHsz',
  appKey: 'N43jv3jZO671FbvmNC7eoT0J',
  serverURL: 'https://6bijc37w.lc-cn-n1-shared.com'
};

let data = {};
let dataReady = false;
let currentResults = [];
let currentFilter = 'all';
let currentPage = 1;
let pageSize = 10; // 每页显示数量
let currentSort = 'default'; // 排序方式

const getPwdFromLink = (link) => {
  try {
    const url = new URL(link);
    return url.searchParams.get('pwd') || '无';
  } catch (err) {
    const matched = link.match(/pwd=([^&]+)/);
    return matched ? matched[1] : '无';
  }
};

// 多个数据源配置（按内容分类）
const dataSources = [
  'guangboju-wanjie.json',    // 完结广播剧
  'guangboju-gengxin.json',   // 更新中广播剧
  'xiaoshuo-wanjie.json',     // 完结小说
  'xiaoshuo-gengxin.json',    // 更新中小说
  'manhua-wanjie.json',       // 完结漫画
  'manhua-gengxin.json',      // 更新中漫画
  'youshengjv.json',          // 有声剧
  'qita.json',                // 其他资源
];

// 加载所有数据源
Promise.all(
  dataSources.map(file => 
    fetch(file)
      .then(res => res.ok ? res.json() : {})
      .catch(() => ({})) // 文件不存在时返回空对象
  )
).then(results => {
  // 合并所有数据（支持嵌套结构）
  results.forEach(fileData => {
    Object.entries(fileData).forEach(([key, value]) => {
      // 如果value是对象且不是链接，说明是分类嵌套
      if (typeof value === 'object' && value !== null && !key.includes('http')) {
        // 展开嵌套的分类数据
        Object.assign(data, value);
      } else {
        // 普通的 名称:链接 格式
        data[key] = value;
      }
    });
  });
  dataReady = true;
  console.log('已加载资源数量:', Object.keys(data).length);
  
  // 从URL参数获取搜索关键词并执行搜索
  const urlParams = new URLSearchParams(window.location.search);
  const keyword = urlParams.get('q');
  if (keyword) {
    performSearch(keyword);
  }
}).catch(() => {
  document.getElementById("resultsList").innerHTML = `
    <div style="text-align: center; padding: 40px; color: #ff6b6b;">
      数据加载失败，请刷新页面重试。
    </div>
  `;
});

function performSearch(keyword) {
  if (!dataReady) {
    setTimeout(() => performSearch(keyword), 100);
    return;
  }

  const matched = Object.entries(data).filter(([name]) =>
    name.includes(keyword)
  );

  currentResults = matched;
  
  // 更新搜索关键词和结果数量
  document.getElementById('searchKeyword').textContent = keyword;
  document.getElementById('resultCount').textContent = matched.length;
  
  if (matched.length === 0) {
    document.getElementById('resultsList').innerHTML = `
      <div style="text-align: center; padding: 40px; color: #88919f;">
        未找到包含"${keyword}"的资源，请尝试其他关键词。
      </div>
    `;
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  
  // 重置到第一页并渲染
  currentPage = 1;
  renderResultsWithPagination(matched);
}

function renderResultsWithPagination(results) {
  const totalPages = Math.ceil(results.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageResults = results.slice(startIndex, endIndex);
  
  renderResults(pageResults);
  renderPagination(totalPages, results);
}

function renderResults(results) {
  const resultsList = document.getElementById('resultsList');
  
  resultsList.innerHTML = results.map(([name, link]) => {
    const pwd = getPwdFromLink(link);
    const category = getCategoryFromName(name);
    const date = getRandomDate(); // 模拟日期
    const source = getSourceFromLink(link);
    
    return `
      <div class="result-card">
        <div class="result-card-title">${name}</div>
        <div class="result-card-meta">
          <span>📅 ${date}</span>
          <span>🌐 来源：${source}</span>
        </div>
        <div class="result-card-actions">
          <a href="#" class="action-btn secondary" onclick="copyLink('${link}')">📋 复制分享</a>
          <a href="#" class="action-btn secondary" onclick="showDetailModal('${name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${link.replace(/'/g, "\\'")}')">👁 查看详情</a>
          <a href="${link}" target="_blank" class="action-btn primary">🔗 立即访问</a>
        </div>
      </div>
    `;
  }).join('');
}

function renderPagination(totalPages, results) {
  const pagination = document.getElementById('pagination');
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  
  let html = '';
  
  // 上一页按钮
  html += `<button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
    onclick="goToPage(${currentPage - 1}, ${JSON.stringify(results).replace(/"/g, '&quot;')})"
    ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
  
  // 页码按钮
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  if (startPage > 1) {
    html += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
    if (startPage > 2) {
      html += `<span class="pagination-ellipsis">...</span>`;
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
      onclick="goToPage(${i})">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="pagination-ellipsis">...</span>`;
    }
    html += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }
  
  // 下一页按钮
  html += `<button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
    onclick="goToPage(${currentPage + 1})"
    ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
  
  pagination.innerHTML = html;
}

function goToPage(page) {
  const filteredResults = getFilteredResults();
  const totalPages = Math.ceil(filteredResults.length / pageSize);
  
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  renderResultsWithPagination(filteredResults);
  
  // 滚动到顶部
  document.querySelector('.results-content').scrollIntoView({ behavior: 'smooth' });
}

function getFilteredResults() {
  let results = currentResults;
  
  // 筛选
  if (currentFilter !== 'all') {
    results = results.filter(([name]) => {
      switch(currentFilter) {
        case 'guangboju': return name.includes('广播剧') || name.includes('有声');
        case 'xiaoshuo': return name.includes('小说');
        case 'manhua': return name.includes('漫画');
        case 'qita': return !name.includes('广播剧') && !name.includes('小说') && !name.includes('漫画') && !name.includes('有声');
        default: return true;
      }
    });
  }
  
  // 排序
  if (currentSort === 'az') {
    results = [...results].sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'));
  } else if (currentSort === 'za') {
    results = [...results].sort((a, b) => b[0].localeCompare(a[0], 'zh-CN'));
  }
  
  return results;
}

// 排序变更
function handleSortChange() {
  currentSort = document.getElementById('sortSelect').value;
  currentPage = 1;
  const filteredResults = getFilteredResults();
  document.getElementById('resultCount').textContent = filteredResults.length;
  renderResultsWithPagination(filteredResults);
}

// 每页条数变更
function handlePageSizeChange() {
  pageSize = parseInt(document.getElementById('pageSizeSelect').value);
  currentPage = 1;
  const filteredResults = getFilteredResults();
  renderResultsWithPagination(filteredResults);
}

function getCategoryFromName(name) {
  if (name.includes('广播剧')) return '广播剧';
  if (name.includes('小说')) return '小说';
  if (name.includes('漫画')) return '漫画';
  return '其他';
}

function getRandomDate() {
  const dates = ['2025-06-14', '2025-11-12', '2025-10-08', '2025-09-22'];
  return dates[Math.floor(Math.random() * dates.length)];
}

function getSourceFromLink(link) {
  if (link.includes('pan.baidu.com')) return '百度网盘';
  if (link.includes('pan.quark.cn') || link.includes('quark.cn')) return '夸克网盘';
  if (link.includes('uc.cn') || link.includes('drive.uc.cn')) return 'UC网盘';
  if (link.includes('xunlei.com') || link.includes('pan.xunlei.com')) return '迅雷网盘';
  return '其他网盘';
}

function copyLink(link) {
  navigator.clipboard.writeText(link).then(() => {
    showToast('链接已复制到剪贴板', 'success');
  }).catch(() => {
    showToast('复制失败，请手动复制', 'error');
  });
}

// 简易Toast提示
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// 详情弹窗功能
let currentDetailLink = '';

function showDetailModal(name, link) {
  currentDetailLink = link;
  
  // 填充详情内容
  document.getElementById('detailTitle').textContent = name;
  document.getElementById('detailCategory').textContent = getCategoryFromName(name);
  document.getElementById('detailDate').textContent = getRandomDate();
  document.getElementById('detailSourceText').textContent = getSourceFromLink(link);
  document.getElementById('detailLink').href = link;
  document.getElementById('detailLink').textContent = link;
  
  // 绑定按钮事件
  document.getElementById('detailCopyBtn').onclick = () => copyLink(link);
  document.getElementById('detailVisitBtn').onclick = () => window.open(link, '_blank');
  
  // 显示弹窗
  document.getElementById('detailModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

// 点击弹窗外部关闭
document.addEventListener('click', (e) => {
  if (e.target.id === 'detailModal') {
    closeDetailModal();
  }
});

function goHome() {
  window.location.href = 'index.html';
}

// 反馈弹窗功能
function showFeedbackModal() {
  document.getElementById('feedbackModal').classList.add('active');
  document.body.style.overflow = 'hidden'; // 防止背景滚动
}

function closeFeedbackModal() {
  document.getElementById('feedbackModal').classList.remove('active');
  document.body.style.overflow = 'auto';
  // 清空表单
  document.getElementById('feedbackForm').reset();
}

function submitFeedback() {
  const type = document.getElementById('feedbackType').value;
  const resourceName = document.getElementById('resourceName').value.trim();
  const content = document.getElementById('feedbackContent').value.trim();
  const contact = document.getElementById('contactInfo').value.trim();

  if (!resourceName && !content) {
    alert('请至少填写资源名称或详细描述');
    return;
  }

  // 构建反馈信息
  const feedbackData = {
    type: type,
    resourceName: resourceName,
    content: content,
    contact: contact,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // 保存到 LeanCloud 云端
  saveFeedbackToCloud(feedbackData);
}

// 保存反馈到 LeanCloud 云端
async function saveFeedbackToCloud(data) {
  try {
    const response = await fetch(`${LEANCLOUD_CONFIG.serverURL}/1.1/classes/Feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LC-Id': LEANCLOUD_CONFIG.appId,
        'X-LC-Key': LEANCLOUD_CONFIG.appKey
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    console.log('提交响应:', response.status, result);
    
    if (response.ok) {
      alert('反馈提交成功！感谢您的反馈，我会尽快处理~');
      closeFeedbackModal();
      console.log('反馈已保存到云端:', data);
    } else {
      throw new Error(result.error || '提交失败');
    }
  } catch (error) {
    console.error('云端保存失败:', error);
    alert('云端提交失败: ' + error.message);
  }
}

// 方案4：生成反馈报告并提示用户发送
function generateFeedbackReport() {
  const feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
  if (feedbacks.length === 0) {
    alert('暂无反馈数据');
    return;
  }

  const report = feedbacks.map((item, index) => {
    return `
=== 反馈 ${index + 1} ===
类型：${item.type}
资源名称：${item.resourceName || '未填写'}
详细描述：${item.content || '未填写'}
联系方式：${item.contact || '未提供'}
提交时间：${item.timestamp}
    `.trim();
  }).join('\n\n');

  // 创建下载链接
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `反馈报告_${new Date().toISOString().split('T')[0]}.txt`;
  link.click();
  URL.revokeObjectURL(url);

  alert('反馈报告已下载，请将文件发送给管理员');
}

function searchFromHeader() {
  const keyword = document.getElementById("headerKeyword").value.trim();
  
  if (!keyword) {
    alert("请输入搜索关键词");
    return;
  }
  
  // 更新URL参数并重新搜索
  const newUrl = `search.html?q=${encodeURIComponent(keyword)}`;
  window.history.pushState({}, '', newUrl);
  
  // 执行搜索
  performSearch(keyword);
}

// 筛选功能
document.addEventListener('DOMContentLoaded', () => {
  // 绑定顶部搜索功能
  const headerSearchBtn = document.getElementById("headerSearchBtn");
  const headerKeyword = document.getElementById("headerKeyword");
  
  if (headerSearchBtn) {
    headerSearchBtn.addEventListener("click", searchFromHeader);
  }
  
  if (headerKeyword) {
    headerKeyword.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        searchFromHeader();
      }
    });
    
    // 将当前搜索关键词填入顶部搜索框
    const urlParams = new URLSearchParams(window.location.search);
    const currentKeyword = urlParams.get('q');
    if (currentKeyword) {
      headerKeyword.value = currentKeyword;
    }
  }

  document.querySelectorAll('.filter-option').forEach(option => {
    option.addEventListener('click', () => {
      // 更新激活状态
      document.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      
      // 获取筛选类型
      const filter = option.dataset.filter;
      currentFilter = filter;
      
      // 筛选结果
      let filteredResults = currentResults;
      if (filter !== 'all') {
        filteredResults = currentResults.filter(([name]) => {
          switch(filter) {
            case 'guangboju': return name.includes('广播剧') || name.includes('有声');
            case 'xiaoshuo': return name.includes('小说');
            case 'manhua': return name.includes('漫画');
            case 'qita': return !name.includes('广播剧') && !name.includes('小说') && !name.includes('漫画') && !name.includes('有声');
            default: return true;
          }
        });
      }
      
      // 重置到第一页并更新结果
      currentPage = 1;
      document.getElementById('resultCount').textContent = filteredResults.length;
      renderResultsWithPagination(filteredResults);
    });
  });
});
