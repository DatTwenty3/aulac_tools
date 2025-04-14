function convertToExcel() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Vui lòng chọn một file Word (.docx)');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const arrayBuffer = event.target.result;

        // Sử dụng mammoth.js để trích xuất HTML từ file Word
        mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
            .then(function(result) {
                const html = result.value;

                // Parse HTML để lấy toàn bộ nội dung
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const body = doc.body;

                // Tạo workbook và worksheet duy nhất
                const wb = XLSX.utils.book_new();
                const rows = [];
                const styles = [];

                // Hàm xử lý từng phần tử HTML và thêm vào rows/styles
                function processElement(element, indent = 0) {
                    const children = element.childNodes;
                    children.forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            const text = node.textContent.trim();
                            if (text) {
                                rows.push([text]);
                                styles.push([getStyleFromElement(element)]);
                            }
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            const tagName = node.tagName.toLowerCase();
                            const text = node.textContent.trim();

                            if (tagName === 'table') {
                                processTable(node);
                            } else if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                                rows.push([text]);
                                styles.push([getStyleFromElement(node)]);
                            } else if (tagName === 'li') {
                                rows.push([`${' '.repeat(indent)}• ${text}`]); // Thêm dấu đầu dòng
                                styles.push([getStyleFromElement(node)]);
                            } else if (['ul', 'ol'].includes(tagName)) {
                                processElement(node, indent + 2); // Tăng thụt đầu dòng cho danh sách
                            }
                        }
                    });
                }

                // Hàm xử lý bảng
                function processTable(table) {
                    const tableRows = table.querySelectorAll('tr');
                    tableRows.forEach(tr => {
                        const cells = [];
                        const cellStyles = [];
                        const tds = tr.querySelectorAll('td, th');

                        tds.forEach(td => {
                            cells.push(td.textContent.trim());
                            cellStyles.push(getStyleFromElement(td));
                        });

                        rows.push(cells);
                        styles.push(cellStyles);
                    });
                }

                // Hàm lấy định dạng từ phần tử HTML
                function getStyleFromElement(element) {
                    const style = element.style;
                    const computedStyle = window.getComputedStyle(element);
                    return {
                        fontSize: style.fontSize || computedStyle.fontSize,
                        color: style.color || computedStyle.color,
                        backgroundColor: style.backgroundColor || computedStyle.backgroundColor,
                        bold: computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight) >= 700
                    };
                }

                // Xử lý toàn bộ nội dung
                processElement(body);

                // Tạo worksheet từ dữ liệu
                const ws = XLSX.utils.aoa_to_sheet(rows);

                // Áp dụng định dạng
                for (let row = 0; row < rows.length; row++) {
                    for (let col = 0; col < rows[row].length; col++) {
                        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                        if (!ws[cellRef]) ws[cellRef] = {};
                        ws[cellRef].s = {
                            font: {
                                sz: parseFloat(styles[row][col].fontSize) || 11,
                                bold: styles[row][col].bold,
                                color: { rgb: parseColor(styles[row][col].color) }
                            },
                            fill: {
                                fgColor: { rgb: parseColor(styles[row][col].backgroundColor) }
                            }
                        };
                    }
                }

                // Điều chỉnh chiều rộng cột
                ws['!cols'] = autoFitColumns(rows);

                // Thêm worksheet vào workbook
                XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

                // Tạo và tải file Excel
                XLSX.writeFile(wb, 'AULAC_output.xlsx');
            })
            .catch(function(err) {
                console.error(err);
                alert('Có lỗi xảy ra khi đọc file Word. Vui lòng kiểm tra file và thử lại.');
            });
    };

    reader.readAsArrayBuffer(file);
}

// Hàm chuyển đổi màu sắc từ CSS sang định dạng RGB HEX cho Excel
function parseColor(color) {
    if (!color || color === 'transparent') return 'FFFFFF'; // Mặc định trắng
    if (color.startsWith('#')) return color.replace('#', '');
    if (color.startsWith('rgb')) {
        const matches = color.match(/\d+/g);
        if (matches) {
            return matches.map(n => parseInt(n).toString(16).padStart(2, '0')).join('').toUpperCase();
        }
    }
    return '000000'; // Mặc định đen
}

// Hàm tự động điều chỉnh chiều rộng cột
function autoFitColumns(rows) {
    const colWidths = [];
    rows.forEach(row => {
        row.forEach((cell, colIndex) => {
            const len = cell ? cell.toString().length : 10;
            colWidths[colIndex] = Math.max(colWidths[colIndex] || 0, len);
        });
    });
    return colWidths.map(w => ({ wch: w + 2 }));
}