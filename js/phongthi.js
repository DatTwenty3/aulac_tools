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
                    
                    // Kiểm tra dữ liệu
                    const validData = results.data.filter(row => {
                        return row.stt && row.question && row.answer;
                    });
                    
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
    function formatQuestionText(raw) {
        if (!raw || typeof raw !== 'string') {
            console.error('Invalid question text:', raw);
            return 'Câu hỏi không hợp lệ';
        }

        // Chuẩn hóa xuống dòng thành 1 dòng
        let text = raw.replace(/\r\n|\r|\n/g, ' ').trim();
        
        // Kiểm tra nếu text rỗng
        if (!text) {
            console.error('Empty question text');
            return 'Câu hỏi không hợp lệ';
        }

        // Tìm vị trí bắt đầu đáp án a.
        let match = text.match(/([aA][\.|\)]\s)/);
        if (!match) {
            console.warn('No answer options found in:', text);
            return text;
        }

        let idx = text.indexOf(match[0]);
        let question = text.slice(0, idx).trim();
        let answers = text.slice(idx);

        // Tách đáp án, chỉ lấy đúng 4 đáp án a, b, c, d
        let answerArr = [];
        let usedLabels = {};
        let regex = /([a-dA-D][\.|\)])\s(.*?)(?= [a-dA-D][\.|\)]|$)/g;
        let m;
        
        while ((m = regex.exec(answers)) !== null) {
            let label = m[1].toLowerCase();
            if (!usedLabels[label] && answerArr.length < 4) {
                answerArr.push(`<b>${m[1].toLowerCase()}</b> ${m[2].trim()}`);
                usedLabels[label] = true;
            }
        }

        // Nếu không đủ 4 đáp án, thử tách theo cách khác
        if (answerArr.length < 4) {
            answerArr = [];
            let parts = answers.split(/([a-dA-D][\.|\)])/);
            for (let i = 1; i < parts.length; i += 2) {
                if (i + 1 < parts.length) {
                    let label = parts[i].toLowerCase();
                    if (!usedLabels[label] && answerArr.length < 4) {
                        answerArr.push(`<b>${label}</b> ${parts[i + 1].trim()}`);
                        usedLabels[label] = true;
                    }
                }
            }
        }

        // Nếu vẫn không đủ 4 đáp án, trả về định dạng đơn giản
        if (answerArr.length < 4) {
            return `<div style="margin-bottom:10px;">${question}</div>` + 
                   `<div style="margin-bottom:4px;">${answers.replace(/([a-d]\.)/gi, '<br><b>$1</b>').replace(/^<br>/, '')}</div>`;
        }

        return `<div style="margin-bottom:10px;">${question}</div>` + 
               answerArr.map(a => `<div style="margin-bottom:4px;">${a}</div>`).join('');
    }

    // Hàm tạo câu hỏi
    function createQuestionElement(question, index) {
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.innerHTML = `
            <div class="question-header">
                <div class="question-number">Câu ${index + 1}</div>
                <div class="question-type">${question.type === 'law' ? 'Pháp luật' : 'Chuyên môn'}</div>
            </div>
            <div class="question-text">${formatQuestionText(question.question)}</div>
            <div class="options-grid">
                <div class="option-item" data-option="A">
                    <div class="option-label">A</div>
                    <div class="option-desc">Lựa chọn A</div>
                </div>
                <div class="option-item" data-option="B">
                    <div class="option-label">B</div>
                    <div class="option-desc">Lựa chọn B</div>
                </div>
                <div class="option-item" data-option="C">
                    <div class="option-label">C</div>
                    <div class="option-desc">Lựa chọn C</div>
                </div>
                <div class="option-item" data-option="D">
                    <div class="option-label">D</div>
                    <div class="option-desc">Lựa chọn D</div>
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
        timerValue.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
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
    }

    // Hàm hiển thị lại bài làm
    function showReview() {
        resultSection.style.display = 'none';
        examSection.style.display = 'block';
        // Render lại các câu hỏi với trạng thái đáp án đã chọn
        questions.forEach((question, index) => {
            const questionCard = questionsContainer.children[index];
            const optionItems = questionCard.querySelectorAll('.option-item');
            optionItems.forEach(item => {
                item.classList.remove('selected', 'correct', 'incorrect', 'correct-full', 'incorrect-full');
                const option = (item.dataset.option || '').trim().toUpperCase();
                const answer = (question.answer || '').trim().toUpperCase();
                const selected = (selectedAnswers[index] || '').trim().toUpperCase();
                // Luôn tô xanh lá đáp án đúng
                if (option === answer) {
                    item.classList.add('correct-full');
                }
                // Nếu chọn sai thì tô đỏ đáp án đã chọn
                if (selected !== answer && option === selected) {
                    item.classList.add('incorrect-full');
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
            
            const selectedLawQuestions = getRandomQuestions(lawQuestions, 10);
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
    });

    // Xử lý sự kiện khi click vào nút nộp bài
    submitButton.addEventListener('click', submitExam);
}); 