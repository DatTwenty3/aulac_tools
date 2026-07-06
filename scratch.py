import re

with open('bandoso.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Hide info-card by default
content = content.replace('<div id="info-card" class="info-card">', '<div id="info-card" class="info-card hidden">')

# 2. Add logo to info toggle button
old_toggle = '''<button id="info-toggle-btn" class="info-toggle-btn" title="Hiển thị thông tin">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    </button>'''
new_toggle = '''<button id="info-toggle-btn" class="info-toggle-btn premium-logo-btn" title="Thông tin AULAC">
      <img src="logo/AULAC_CONS.png" alt="AULAC Logo" style="width: 24px; height: 24px; border-radius: 50%;">
    </button>'''
content = content.replace(old_toggle, new_toggle)

# 3. Add Close Button inside Info Card Content
content = content.replace('<div class="info-card-content">', '<div class="info-card-content">\n        <button id="info-card-close-btn" class="info-card-close-btn" style="position: absolute; right: 10px; top: 10px; z-index: 10; border: none; background: transparent; cursor: pointer;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>')

# 4. Extract Search Bar and put it at the top of the container
search_bar_regex = re.compile(r'<!-- Thanh tìm kiếm -->(.*?)</div>\s*<!-- Các nút công cụ -->', re.DOTALL)
search_match = search_bar_regex.search(content)
search_html = search_match.group(1).strip() + "</div>"
content = search_bar_regex.sub('<!-- Các nút công cụ -->', content)

# Remove "span Tìm kiếm" text to make search button smaller
search_html = search_html.replace('<span>Tìm kiếm</span>', '')

floating_search = f'''
    <!-- 1. Floating Search Bar (Top-Center) -->
    <div class="floating-search">
      {search_html}
    </div>
'''
content = content.replace('<div id="map"></div>', f'<div id="map"></div>\n{floating_search}')

# 5. Extract Map Tools Container and put it in a Floating Dock
tools_container_regex = re.compile(r'<!-- Các nút công cụ -->\s*<div class="map-tools-container">(.*?)<!-- Nhóm Vẽ chú thích đã bị xóa -->\s*</div>', re.DOTALL)
tools_match = tools_container_regex.search(content)
tools_html = tools_match.group(1).strip()
content = tools_container_regex.sub('', content)

# We want to extract just the buttons we need for the dock
dock_html = f'''
    <!-- 2. Floating Dock Công cụ (Bottom-Center) -->
    <div class="floating-dock" id="floating-dock">
        {tools_html}
    </div>
'''
content = content.replace('<!-- Panel thông tin xã/phường trượt từ bên phải -->', f'{dock_html}\n    <!-- Panel thông tin xã/phường trượt từ bên phải -->')

# 6. Transform tools toggle into settings toggle
old_tools_toggle = '''<button id="tools-toggle-btn" class="tools-toggle-btn" title="Mở công cụ">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    </button>'''
new_tools_toggle = '''<button id="tools-toggle-btn" class="tools-toggle-btn settings-fab" title="Cài đặt Bản đồ">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    </button>'''
content = content.replace(old_tools_toggle, new_tools_toggle)

# 7. Remove tools-panel-tabs entirely
tabs_regex = re.compile(r'<!-- Tab navigation -->\s*<div class="tools-panel-tabs">.*?</div>\s*<div class="tools-panel-body">\s*<!-- Ngăn Công cụ -->\s*<div class="tools-tab-content active" id="tab-tools">\s*</div>', re.DOTALL)
content = tabs_regex.sub('<div class="tools-panel-body">', content)

# Rename the header title
content = content.replace('<h2 class="tools-panel-title">Công cụ</h2>', '<h2 class="tools-panel-title">Cài đặt</h2>')

# Make the tab-settings active by default
content = content.replace('<div class="tools-tab-content" id="tab-settings">', '<div class="tools-tab-content active" id="tab-settings">')

with open('bandoso.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("bandoso.html refactored!")
