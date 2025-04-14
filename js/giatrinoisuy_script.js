// script.js
document.getElementById('interpolationForm').addEventListener('submit', function (e) {
    e.preventDefault();
  
    const x0 = parseFloat(document.getElementById('x0').value);
    const y0 = parseFloat(document.getElementById('y0').value);
    const x1 = parseFloat(document.getElementById('x1').value);
    const y1 = parseFloat(document.getElementById('y1').value);
    const x = parseFloat(document.getElementById('x').value);
  
    let resultText = '';
  
    if (x0 === x1) {
      resultText = 'Không thể nội suy: x₀ và x₁ phải khác nhau.';
    } else if (x < Math.min(x0, x1) || x > Math.max(x0, x1)) {
      resultText = 'Giá trị nội suy nằm ngoài khoảng [x₀, x₁].';
    } else {
      const y = y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      resultText = `Giá trị nội suy tại ${x} là: ${y.toFixed(3)}`;
    }
  
    document.getElementById('result').textContent = resultText;
  });
  