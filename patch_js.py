import re

with open('js/bandoso.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# Add event listener for #info-card-close-btn
if "info-card-close-btn" not in js_content:
    # Find the place where info-toggle-btn is set up
    # It might be in setupInfoPanel or just at DOMContentLoaded
    setup_info_card = """
  const infoToggleBtn = document.getElementById('info-toggle-btn');
  const infoCard = document.getElementById('info-card');
  const infoCardCloseBtn = document.getElementById('info-card-close-btn');
  
  if (infoToggleBtn && infoCard) {
    infoToggleBtn.addEventListener('click', () => {
      infoCard.classList.toggle('hidden');
    });
  }
  if (infoCardCloseBtn && infoCard) {
    infoCardCloseBtn.addEventListener('click', () => {
      infoCard.classList.add('hidden');
    });
  }
"""
    # Replace the existing info toggle logic or append
    old_info_toggle = """  const infoToggleBtn = document.getElementById('info-toggle-btn');
  const infoCard = document.getElementById('info-card');
  if (infoToggleBtn && infoCard) {
    infoToggleBtn.addEventListener('click', () => {
      infoCard.classList.toggle('hidden');
    });
  }"""
    
    if old_info_toggle in js_content:
        js_content = js_content.replace(old_info_toggle, setup_info_card)
    else:
        # Just append it to the end of the file
        js_content += "\n" + setup_info_card

with open('js/bandoso.js', 'w', encoding='utf-8') as f:
    f.write(js_content)
print("js patched!")
