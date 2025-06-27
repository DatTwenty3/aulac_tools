// phongthi.js - Xử lý logic thi trực tuyến
import subjectsConfig from './subjects_config.js';

document.addEventListener('DOMContentLoaded', function() {
    const selectStyled = document.getElementById('selectStyled');
    const selectOptions = document.getElementById('selectOptions');
    const startButton = document.getElementById('startButton');
    const selectPlaceholder = selectStyled.querySelector('.select-placeholder');
    const selectionSection = document.getElementById('selectionSection');
    const examSection = document.getElementById('examSection');
    const resultSection = document.getElementById('resultSection');
    const questionsContainer = document.getElementById('questionsContainer');
    const timerValue = document.getElementById('timerValue');
    const submitButton = document.getElementById('submitButton');

    // Danh sách các môn thi
    const subjects = subjectsConfig.map(subject => ({
        id: subject.id,
        title: subject.title,
        subtitle: subject.subtitle,
        icon: subject.icon,
        files: {
            law: subject.files.law.map(file => `data/${file}`),
            specialized: subject.files.specialized.map(file => `data/${file}`)
        }
    }));

    // Tạo danh sách chọn môn thi
    subjects.forEach(subject => {
        const option = document.createElement('div');
        option.className = 'select-option';
        option.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span class="option-icon" style="font-size: 2em; display: flex; align-items: center;">${subject.icon || '📚'}</span>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 600; color: #222;">${subject.title}</span>
                    <span style="font-size: 0.98em; color: #888; font-style: italic;">${subject.subtitle}</span>
                </div>
            </div>
        `;
        option.addEventListener('click', () => {
            // Hiển thị icon, tên môn thi và subtitle đẹp hơn trong ô chọn, căn trái, không in nghiêng
            selectPlaceholder.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <span class="option-icon" style="font-size: 2em; display: flex; align-items: flex-start; font-style: normal;">${subject.icon || '📚'}</span>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 600; color: #222; font-style: normal;">${subject.title}</span>
                        <span style="font-size: 0.98em; color: #888; font-style: normal;">${subject.subtitle}</span>
                    </div>
                </div>
            `;
            selectStyled.classList.remove('active');
            selectOptions.classList.remove('show');
            startButton.classList.add('enabled');
            startButton.dataset.subjectId = subject.id;
        });
        selectOptions.appendChild(option);
    });

    // Xử lý sự kiện khi click vào select-styled
    selectStyled.addEventListener('click', function() {
        selectStyled.classList.toggle('active');
        selectOptions.classList.toggle('show');
    });

    // Biến lưu trữ câu hỏi và đáp án
    let questions = [];
    let selectedAnswers = {};
    let timeLeft = 30 * 60; // 30 phút
    let timerInterval;
    let totalTime = 30 * 60; // 30 phút, lưu lại để tính thời gian làm bài

    // Hàm đọc file CSV
    async function readCSVFile(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                download: true,
                header: true,
                skipEmptyLines: true,
                transformHeader: header => header.trim(),
                transform: value => value.trim(),
                complete: function(results) {
                    if (results.errors && results.errors.length > 0) {
                        console.error('CSV parsing errors:', results.errors);
                        reject(new Error('Lỗi khi đọc file CSV: ' + results.errors[0].message));
                        return;
                    }
                    // Gắn subLabel dựa vào tên file
                    let subLabel = '';
                    if (file.includes('PLR')) subLabel = 'Pháp luật riêng';
                    else if (file.includes('PLC')) subLabel = 'Pháp luật chung';
                    else if (file.includes('CM')) subLabel = 'Chuyên môn';
                    else subLabel = '';
                    const validData = results.data.filter(row => {
                        return row.stt && row.question && row.answer;
                    }).map(row => ({...row, subLabel}));
                    if (validData.length === 0) {
                        reject(new Error('Không tìm thấy dữ liệu hợp lệ trong file CSV'));
                        return;
                    }
                    resolve(validData);
                },
                error: function(error) {
                    console.error('CSV download error:', error);
                    reject(new Error('Không thể tải file CSV: ' + error.message));
                }
            });
        });
    }

    // Hàm tải dữ liệu câu hỏi
    async function loadQuestions(subjectId) {
        try {
            const subject = subjects.find(s => s.id === subjectId);
            if (!subject) {
                throw new Error('Không tìm thấy môn thi');
            }

            let allQuestions = [];
            
            // Tải câu hỏi pháp luật
            for (const file of subject.files.law) {
                try {
                    const questions = await readCSVFile(file);
                    questions.forEach(q => q.type = 'law');
                    allQuestions = allQuestions.concat(questions);
                } catch (error) {
                    console.error(`Lỗi khi tải file ${file}:`, error);
                    throw new Error(`Không thể tải câu hỏi pháp luật: ${error.message}`);
                }
            }

            // Tải câu hỏi chuyên môn
            for (const file of subject.files.specialized) {
                try {
                    const questions = await readCSVFile(file);
                    questions.forEach(q => q.type = 'specialized');
                    allQuestions = allQuestions.concat(questions);
                } catch (error) {
                    console.error(`Lỗi khi tải file ${file}:`, error);
                    throw new Error(`Không thể tải câu hỏi chuyên môn: ${error.message}`);
                }
            }

            if (allQuestions.length === 0) {
                throw new Error('Không tìm thấy câu hỏi nào');
            }

            return allQuestions;
        } catch (error) {
            console.error('Lỗi khi tải câu hỏi:', error);
            throw error;
        }
    }

    // Hàm chọn ngẫu nhiên câu hỏi
    function getRandomQuestions(questions, count) {
        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // Hàm định dạng lại câu hỏi và đáp án từ 1 chuỗi (copy từ tracnghiem.js)
    function parseQuestionAndAnswers(raw) {
        if (!raw || typeof raw !== 'string') {
            console.error('Invalid question text:', raw);
            return { question: 'Câu hỏi không hợp lệ', answers: [] };
        }
        // Chuẩn hóa xuống dòng thành \n để nhận diện đáp án nhiều dòng
        let text = raw.replace(/\r\n|\r/g, '\n');
        if (!text) {
            console.error('Empty question text');
            return { question: 'Câu hỏi không hợp lệ', answers: [] };
        }
        // Tìm vị trí bắt đầu đáp án a.
        let match = text.match(/([aA][\.|\)])\s?/);
        if (!match) {
            console.warn('No answer options found in:', text);
            return { question: text, answers: [] };
        }
        let idx = text.indexOf(match[0]);
        let question = text.slice(0, idx).trim();
        let answers = text.slice(idx);
        // Regex 1: nhận diện đáp án ở đầu dòng hoặc sau dấu xuống dòng
        let answerArr = [];
        let usedLabels = {};
        let regex1 = /(^|\n)([a-dA-D][\.|\)])\s*((?:.|\n)*?)(?=(?:\n[a-dA-D][\.|\)])|$)/g;
        let m;
        while ((m = regex1.exec(answers)) !== null) {
            let label = m[2].toUpperCase();
            if (!usedLabels[label] && answerArr.length < 4) {
                answerArr.push(m[3].trim().replace(/\s+/g, ' '));
                usedLabels[label] = true;
            }
        }
        // Nếu không đủ 4 đáp án, thử lại với regex tách liền nhau trên một dòng
        if (answerArr.length < 4) {
            answerArr = [];
            usedLabels = {};
            let regex2 = /([a-dA-D][\.|\)])\s*([^a-dA-D]*)/g;
            let m2;
            while ((m2 = regex2.exec(answers)) !== null && answerArr.length < 4) {
                let label = m2[1].toUpperCase();
                if (!usedLabels[label]) {
                    let value = m2[2].replace(/\s+/g, ' ').trim();
                    // Loại bỏ nhãn đáp án tiếp theo nếu bị dính vào
                    value = value.replace(/([a-dA-D][\.|\)]).*/, '').trim();
                    answerArr.push(value);
                    usedLabels[label] = true;
                }
            }
        }
        if (answerArr.length < 4) {
            return { question: text, answers: [] };
        }
        return { question, answers: answerArr };
    }

    // Hàm tạo câu hỏi
    function createQuestionElement(question, index) {
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        // Phân tích câu hỏi và đáp án
        const parsed = parseQuestionAndAnswers(question.question);
        // Lấy subLabel từ dữ liệu câu hỏi
        let subLabel = question.subLabel || (question.type === 'law' ? 'Pháp luật' : (question.type === 'specialized' ? 'Chuyên môn' : ''));
        let stt = question.stt || (index + 1);
        // Hiển thị nguồn gốc ở góc phải trên
        questionCard.innerHTML = `
            <div class="question-header">
                <div class="question-number">Câu ${index + 1}</div>
                <div class="question-type" style="font-size:0.98em; color:#888; font-style:italic;">Được lấy từ câu ${stt} - ${subLabel}</div>
            </div>
            <div class="question-text">${parsed.question.replace(/\s+/g, ' ').trim()}</div>
            <div class="options-grid">
                <div class="option-item" data-option="A">
                    <div class="option-label">A</div>
                    <div class="option-desc">${parsed.answers[0] ? parsed.answers[0] : ''}</div>
                </div>
                <div class="option-item" data-option="B">
                    <div class="option-label">B</div>
                    <div class="option-desc">${parsed.answers[1] ? parsed.answers[1] : ''}</div>
                </div>
                <div class="option-item" data-option="C">
                    <div class="option-label">C</div>
                    <div class="option-desc">${parsed.answers[2] ? parsed.answers[2] : ''}</div>
                </div>
                <div class="option-item" data-option="D">
                    <div class="option-label">D</div>
                    <div class="option-desc">${parsed.answers[3] ? parsed.answers[3] : ''}</div>
                </div>
            </div>
        `;
        // Xử lý sự kiện chọn đáp án
        const optionItems = questionCard.querySelectorAll('.option-item');
        optionItems.forEach(item => {
            item.addEventListener('click', () => {
                optionItems.forEach(opt => opt.classList.remove('selected'));
                item.classList.add('selected');
                selectedAnswers[index] = item.dataset.option;
            });
        });
        return questionCard;
    }

    // Hàm cập nhật đồng hồ
    function updateTimer() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Cập nhật ở thanh công cụ chính
        timerValue.textContent = timeString;

        // Cập nhật ở nút cuộn lên đầu trang
        const scrollToTopTimer = document.getElementById('scrollToTopTimer');
        if (scrollToTopTimer) {
            scrollToTopTimer.textContent = timeString;
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitExam();
        }
        timeLeft--;
    }

    // Hàm nộp bài
    async function submitExam() {
        clearInterval(timerInterval);
        
        // Tính điểm
        let lawScore = 0;
        let specializedScore = 0;
        let totalQuestions = questions.length;
        let lawQuestions = questions.filter(q => q.type === 'law').length;
        let specializedQuestions = questions.filter(q => q.type === 'specialized').length;
        
        questions.forEach((question, index) => {
            const selectedAnswer = selectedAnswers[index];
            if (selectedAnswer && question.answer && selectedAnswer.toUpperCase() === question.answer.toUpperCase()) {
                if (question.type === 'law') {
                    lawScore++;
                } else if (question.type === 'specialized') {
                    specializedScore++;
                }
            }
        });

        // Tính điểm theo tỷ lệ
        const lawPercentage = lawQuestions > 0 ? (lawScore / lawQuestions) * 10 : 0;
        const specializedPercentage = specializedQuestions > 0 ? (specializedScore / specializedQuestions) * 20 : 0;
        const totalScore = Math.round(lawPercentage + specializedPercentage);

        // Kiểm tra điều kiện đạt/không đạt
        const isPassed = lawScore >= 7 && totalScore >= 21;

        // Hiển thị kết quả
        document.getElementById('totalScore').textContent = `${totalScore}/30`;
        document.getElementById('lawScore').textContent = `${lawScore}/${lawQuestions}`;
        document.getElementById('specializedScore').textContent = `${specializedScore}/${specializedQuestions}`;

        // Thêm thông báo kết quả
        const resultHeader = document.querySelector('.result-header');
        resultHeader.innerHTML = `
            <h2>Kết quả bài thi</h2>
            <div class="result-message ${isPassed ? 'passed' : 'failed'}">
                ${isPassed ? 
                    '<div class="message-icon">🎉</div>' : 
                    '<div class="message-icon">😔</div>'
                }
                <div class="message-text">
                    ${isPassed ? 
                        'Chúc mừng bạn đã đạt yêu cầu!' : 
                        'Rất tiếc, bạn chưa đạt yêu cầu.'
                    }
                </div>
                <div class="message-detail">
                    ${isPassed ? 
                        'Bạn đã hoàn thành xuất sắc bài thi.' : 
                        'Bạn cần đạt tối thiểu 7 điểm phần Pháp luật và tổng điểm từ 21 điểm trở lên.'
                    }
                </div>
            </div>
        `;

        // Hiển thị đáp án đúng/sai
        questions.forEach((question, index) => {
            const questionCard = questionsContainer.children[index];
            if (!questionCard) return;
            
            const optionItems = questionCard.querySelectorAll('.option-item');
            const selectedAnswer = selectedAnswers[index];
            
            optionItems.forEach(item => {
                const option = item.dataset.option;
                if (option && question.answer && option.toUpperCase() === question.answer.toUpperCase()) {
                    item.classList.add('correct');
                } else if (selectedAnswer && option === selectedAnswer && option !== question.answer) {
                    item.classList.add('incorrect');
                }
            });
        });

        // Hiển thị phần kết quả
        examSection.style.display = 'none';
        resultSection.style.display = 'block';

        // Thêm nút xem lại bài làm nếu chưa có
        if (!document.getElementById('reviewButton')) {
            const reviewBtn = document.createElement('button');
            reviewBtn.className = 'btn-phongthi';
            reviewBtn.id = 'reviewButton';
            reviewBtn.textContent = 'Xem lại bài làm';
            reviewBtn.onclick = function() {
                showReview();
            };
            document.querySelector('.result-actions').appendChild(reviewBtn);
        }

        // Tính thời gian làm bài
        const timeUsedSec = totalTime - timeLeft - 1;
        const min = Math.floor(timeUsedSec / 60);
        const sec = timeUsedSec % 60;
        document.getElementById('timeUsed').textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

        // Kích hoạt nút sau khi bài thi hiển thị
        toggleScrollToTopButton(true);
    }

    // Hàm hiển thị lại bài làm
    function showReview() {
        resultSection.style.display = 'none';
        examSection.style.display = 'block';
        // Render lại các câu hỏi với trạng thái đáp án đã chọn
        questions.forEach((question, index) => {
            const questionCard = questionsContainer.children[index];
            if (!questionCard) return;

            const optionItems = questionCard.querySelectorAll('.option-item');
            const selected = (selectedAnswers[index] || '').trim().toUpperCase();
            const answer = (question.answer || '').trim().toUpperCase();

            optionItems.forEach(item => {
                // Reset các class cũ
                item.classList.remove('selected', 'correct', 'incorrect', 'correct-full', 'incorrect-full', 'user-selected-answer');
                
                const option = (item.dataset.option || '').trim().toUpperCase();
                
                // Luôn tô xanh lá đáp án đúng
                if (option === answer) {
                    item.classList.add('correct-full');
                }
                
                // Nếu chọn sai thì tô đỏ đáp án đã chọn
                if (selected && selected !== answer && option === selected) {
                    item.classList.add('incorrect-full');
                }
                
                // Thêm class animation cho đáp án người dùng đã chọn (dù đúng hay sai)
                if (selected && option === selected) {
                    item.classList.add('user-selected-answer');
                }
            });
        });
        // Ẩn nút nộp bài khi xem lại
        submitButton.style.display = 'none';
        // Thêm nút quay về tổng kết nếu chưa có
        if (!document.getElementById('backToResultBtn')) {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.justifyContent = 'center';
            wrapper.style.marginTop = '32px';
            const backBtn = document.createElement('button');
            backBtn.className = 'btn-phongthi';
            backBtn.id = 'backToResultBtn';
            backBtn.textContent = 'Quay về trang tổng kết';
            backBtn.onclick = function() {
                examSection.style.display = 'none';
                resultSection.style.display = 'block';
                submitButton.style.display = '';
                // Xóa nút khi quay lại
                if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
            };
            wrapper.appendChild(backBtn);
            examSection.appendChild(wrapper);
        }
        // Cuộn lên đầu
        window.scrollTo({top: 0, behavior: 'smooth'});

        // Kích hoạt nút sau khi xem review
        toggleScrollToTopButton(true);
    }

    // Hàm chọn ngẫu nhiên câu hỏi Pháp luật chung và riêng, đảm bảo mỗi loại có ít nhất 1 câu
    function getRandomLawQuestions(lawQuestions) {
        // Tách riêng PLC và PLR
        const lawChung = lawQuestions.filter(q => (q.subLabel || '').includes('Pháp luật chung'));
        const lawRieng = lawQuestions.filter(q => (q.subLabel || '').includes('Pháp luật riêng'));
        // Nếu chỉ có 1 nhóm, lấy đủ 10 câu từ nhóm đó
        if (lawChung.length === 0) {
            return getRandomQuestions(lawRieng, 10);
        }
        if (lawRieng.length === 0) {
            return getRandomQuestions(lawChung, 10);
        }
        // Đảm bảo mỗi nhóm có ít nhất 1 câu
        const selected = [];
        // Lấy 1 câu ngẫu nhiên từ mỗi nhóm
        selected.push(getRandomQuestions(lawChung, 1)[0]);
        selected.push(getRandomQuestions(lawRieng, 1)[0]);
        // Số còn lại là 8 câu, chia ngẫu nhiên cho 2 nhóm
        const remainingChung = lawChung.filter(q => q !== selected[0]);
        const remainingRieng = lawRieng.filter(q => q !== selected[1]);
        // Gộp lại và xáo trộn
        const remaining = [...remainingChung, ...remainingRieng];
        const more = getRandomQuestions(remaining, 8);
        return getRandomQuestions([...selected, ...more], 10); // Xáo trộn lại lần nữa cho đều
    }

    // Cập nhật xử lý sự kiện nút bắt đầu
    startButton.addEventListener('click', async function() {
        const subjectId = this.dataset.subjectId;
        if (!subjectId) {
            alert('Vui lòng chọn môn thi');
            return;
        }

        try {
            // Hiển thị loading
            startButton.disabled = true;
            startButton.textContent = 'Đang tải...';

            // Tải câu hỏi
            questions = await loadQuestions(subjectId);
            
            // Chọn ngẫu nhiên câu hỏi
            const lawQuestions = questions.filter(q => q.type === 'law');
            const specializedQuestions = questions.filter(q => q.type === 'specialized');
            
            // SỬA ĐOẠN NÀY: chọn 10 câu pháp luật theo tỷ lệ ngẫu nhiên nhưng phải có ít nhất 1 câu PLC và 1 câu PLR
            const selectedLawQuestions = getRandomLawQuestions(lawQuestions);
            const selectedSpecializedQuestions = getRandomQuestions(specializedQuestions, 20);

            questions = [...selectedLawQuestions, ...selectedSpecializedQuestions];

            // Tạo giao diện câu hỏi
            questionsContainer.innerHTML = '';
            questions.forEach((question, index) => {
                const questionElement = createQuestionElement(question, index);
                questionsContainer.appendChild(questionElement);
            });

            // Hiển thị phần thi
            selectionSection.style.display = 'none';
            examSection.style.display = 'block';

            // Bắt đầu đếm thời gian
            timeLeft = 30 * 60;
            totalTime = timeLeft;
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);

        } catch (error) {
            alert('Có lỗi xảy ra: ' + error.message);
            console.error('Lỗi khi bắt đầu thi:', error);
        } finally {
            // Reset trạng thái nút
            startButton.disabled = false;
            startButton.textContent = 'Bắt đầu thi';
        }

        // Kích hoạt nút sau khi bài thi hiển thị
        toggleScrollToTopButton(true);
    });

    // Xử lý sự kiện khi click vào nút nộp bài
    submitButton.addEventListener('click', submitExam);

    // --- Logic cho nút cuộn lên đầu trang ---
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    if (scrollToTopBtn) {
        // Mặc định ẩn nút đi
        scrollToTopBtn.style.display = 'none';

        // Logic ẩn/hiện nút dựa trên scroll và chỉ khi đang ở màn hình thi
        window.addEventListener('scroll', () => {
            // Điều kiện 1: Phải ở màn hình thi
            const isExamVisible = examSection.style.display === 'block';
            // Điều kiện 2: Phải cuộn đủ xa
            const isScrolledDown = document.body.scrollTop > 150 || document.documentElement.scrollTop > 150;
            // Điều kiện 3: Không phải đang xem lại (nút Nộp bài chính phải đang hiển thị)
            const isReviewing = submitButton.style.display === 'none';

            if (isExamVisible && isScrolledDown && !isReviewing) {
                scrollToTopBtn.style.display = 'flex';
            } else {
                scrollToTopBtn.style.display = 'none';
            }
        });

        // Logic click để cuộn lên
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}); 