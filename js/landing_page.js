// Danh sách màu sắc để đổi màu liên tục
const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#8f00ff'];
let colorIndex = 0;

// Lấy tất cả các span trong .dev-text
const spans = document.querySelectorAll('.dev-text span');

// Hàm đổi màu cho từng span
function changeColors() {
    spans.forEach((span, index) => {
        span.style.color = colors[(colorIndex + index) % colors.length];
    });
    colorIndex = (colorIndex + 1) % colors.length;
}

// Đổi màu mỗi 500ms
setInterval(changeColors, 500);