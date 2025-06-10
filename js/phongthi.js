// phongthi.js - Xử lý danh sách chọn nội dung thi
document.addEventListener('DOMContentLoaded', function() {
    const selectStyled = document.getElementById('selectStyled');
    const selectOptions = document.getElementById('selectOptions');
    const startButton = document.getElementById('startButton');
    const selectPlaceholder = selectStyled.querySelector('.select-placeholder');

    // Danh sách các chủ đề thi
    const topics = [
        { id: 'topic1', title: 'Chủ đề 1', subtitle: 'Mô tả chủ đề 1' },
        { id: 'topic2', title: 'Chủ đề 2', subtitle: 'Mô tả chủ đề 2' },
        { id: 'topic3', title: 'Chủ đề 3', subtitle: 'Mô tả chủ đề 3' }
    ];

    // Tạo danh sách chọn
    topics.forEach(topic => {
        const option = document.createElement('div');
        option.className = 'select-option';
        option.innerHTML = `
            <div class="option-icon">📚</div>
            <div class="option-content">
                <div class="option-title">${topic.title}</div>
                <div class="option-subtitle">${topic.subtitle}</div>
            </div>
        `;
        option.addEventListener('click', () => {
            selectPlaceholder.textContent = topic.title;
            selectStyled.classList.remove('active');
            selectOptions.classList.remove('show');
            startButton.classList.add('enabled');
        });
        selectOptions.appendChild(option);
    });

    // Xử lý sự kiện khi click vào select-styled
    selectStyled.addEventListener('click', function() {
        selectStyled.classList.toggle('active');
        selectOptions.classList.toggle('show');
    });

    // Xử lý sự kiện khi click vào nút bắt đầu thi
    startButton.addEventListener('click', function() {
        if (startButton.classList.contains('enabled')) {
            alert('Bắt đầu thi với chủ đề: ' + selectPlaceholder.textContent);
            // Thêm logic bắt đầu thi ở đây
        }
    });
}); 