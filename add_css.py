import sys

new_css = """
/* =========================================================
   PREMIUM UI OVERRIDES (FLOATING PILLS)
========================================================= */

/* 1. Floating Search Bar */
.floating-search {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1200;
  width: 90%;
  max-width: 400px;
  pointer-events: auto;
}
.floating-search .search-bar-modern {
  flex-direction: row;
  align-items: center;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 999px;
  padding: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 0.5px solid rgba(255, 255, 255, 0.5);
}
.floating-search .search-input-modern {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 10px 16px;
  font-size: 1rem;
}
.floating-search .search-input-modern:focus {
  background: transparent;
  box-shadow: none;
}
.floating-search .search-btn-modern {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  padding: 0;
  margin-left: 4px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

/* 2. Settings FAB (Top Right) */
.settings-fab {
  top: 20px;
  right: 20px;
  transform: none;
}
.settings-fab:hover {
  transform: scale(1.05);
}

/* 3. Dropdown Settings Panel */
#tools-panel {
  top: 70px;
  right: 20px;
  height: auto;
  max-height: calc(100vh - 100px);
  width: 320px;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-20px);
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
#tools-panel.visible {
  transform: translateY(0);
  opacity: 1;
  pointer-events: auto;
  animation: none; /* remove slideInRight */
}

/* 4. Floating Dock (Bottom Center) */
.floating-dock {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1200;
  display: flex;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 999px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 0.5px solid rgba(255, 255, 255, 0.5);
  pointer-events: auto;
}
.floating-dock .tool-group-header,
.floating-dock .point-naming-option,
.floating-dock .selected-points-info,
.floating-dock #kml-kmz-import-list {
  display: none !important;
}
.floating-dock .tool-group-content {
  display: flex;
  gap: 8px;
}
.floating-dock .tool-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50% !important;
  padding: 0 !important;
  justify-content: center;
}
.floating-dock .tool-btn span {
  display: none; /* Hide text, only show icon */
}
.floating-dock .coordinate-system-selector {
  display: none; /* Hide coordinate dropdowns from dock for now, or style them as a popup */
}

/* 5. Minimal Info Card */
.premium-logo-btn {
  padding: 0;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}
#info-card {
  bottom: 74px;
  left: 20px;
  transform: translateY(20px);
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s ease;
}
#info-card:not(.hidden) {
  transform: translateY(0);
  opacity: 1;
  pointer-events: auto;
}
"""

try:
    with open('css/bandoso.css', 'r', encoding='utf-8') as f:
        content = f.read()
    with open('css/bandoso.css', 'w', encoding='utf-8') as f:
        f.write(content + "\n" + new_css)
    print("CSS appended as UTF-8!")
except UnicodeDecodeError:
    with open('css/bandoso.css', 'r', encoding='utf-16') as f:
        content = f.read()
    with open('css/bandoso.css', 'w', encoding='utf-16') as f:
        f.write(content + "\n" + new_css)
    print("CSS appended as UTF-16!")
