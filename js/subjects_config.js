const subjectsConfig = [
    {
        id: 'hamcau',
        title: 'Thiết kế xây XDCT: CT Cầu - Hầm, Hạng II',
        subtitle: 'Thi chứng chỉ hành nghề Thiết kế xây XDCT: CT Cầu - Hầm, Hạng II',
        icon: '🌉',
        files: {
            law: ['Hamcau_PLC.csv', 'Hamcau_PLR.csv'],
            specialized: ['Hamcau_CM.csv']
        }
    },
    {
        id: 'diahinh',
        title: 'Khảo sát địa hình, Hạng II',
        subtitle: 'Thi chứng chỉ hành nghề Khảo sát địa hình, Hạng II',
        icon: '🔍',
        files: {
            law: ['Khaosatdiahinh_PLC.csv', 'Khaosatdiahinh_PLR.csv'],
            specialized: ['Khaosatdiahinh_CM.csv']
        }
    },
    {
        id: 'dinhgia',
        title: 'Định giá xây dựng, Hạng II',
        subtitle: 'Thi chứng chỉ hành nghề Định giá xây dựng, Hạng II',
        icon: '💰',
        files: {
            law: ['Dinhgia_PLC.csv', 'Dinhgia_PLR.csv'],
            specialized: ['Dinhgia_CM.csv']
        }
    },
    {
        id: 'duongbo',
        title: 'Đường bộ, Hạng II',
        subtitle: 'Thi chứng chỉ hành nghề Thiết kế xây XDCT: CT Đường bộ, Hạng II',
        icon: '🚗',
        files: {
            law: ['Duongbo_PLC.csv', 'Duongbo_PLR.csv'],
            specialized: ['Duongbo_CM.csv']
        }
    },
    {
        id: 'giamsat',
        title: 'Giám sát công tác xây dựng công trình, Hạng II',
        subtitle: 'Thi chứng chỉ hành nghề Giám sát công tác xây dựng công trình, Hạng II',
        icon: '👷',
        files: {
            law: ['Giamsat_PLC.csv', 'Giamsat_PLR.csv'],
            specialized: ['Giamsat_CM.csv']
        }
    },
    {
        id: 'quanly',
        title: 'Quản lý dự án đầu tư xây dựng, Hạng II',
        subtitle: 'Thi chứng chỉ hành nghề Quản lý dự án đầu tư xây dựng, Hạng II',
        icon: '🏢',
        files: {
            law: ['Quanly_PLC.csv', 'Quanly_PLR.csv'],
            specialized: ['Quanly_CM.csv']
        }
    },
    {
        id: 'diachat',
        title: 'Khảo sát địa chất công trình, Hạng III',
        subtitle: 'Thi chứng chỉ hành nghề Khảo sát địa chất công trình, Hạng III',
        icon: '💎',
        files: {
            law: ['Khaosatdiachat_PLC.csv', 'Khaosatdiachat_PLR.csv'],
            specialized: ['Khaosatdiachat_CM.csv']
        }
    },
    {
        id: 'giamsat3',
        title: 'Giám sát công tác xây dựng công trình, Hạng III',
        subtitle: 'Thi chứng chỉ hành nghề Giám sát công tác xây dựng công trình, Hạng III',
        icon: '👷',
        files: {
            law: ['giamsathang3_PLC.csv', 'giamsathang3_PLR.csv'],
            specialized: ['giamsathang3_CM.csv']
        }
    },
    {
        id: 'hamcau33',
        title: 'Thiết kế xây XDCT: CT Cầu - Hầm, Hạng III',
        subtitle: 'Thi chứng chỉ hành nghề Thiết kế xây XDCT: CT Cầu - Hầm, Hạng III',
        icon: '🌉',
        files: {
            law: ['cauhamhang3_PLC.csv', 'cauhamhang3_PLR.csv'],
            specialized: ['cauhamhang3_CM.csv']
        }
    },
    {
        id: 'duongbo3',
        title: 'Đường bộ, Hạng III',
        subtitle: 'Thi chứng chỉ hành nghề Thiết kế xây XDCT: CT Đường bộ, Hạng III',
        icon: '🚗',
        files: {
            law: ['duongbohang3_PLC.csv', 'duongbohang3_PLR.csv'],
            specialized: ['duongbohang3_CM.csv']
        }
    },
    {
        id: 'quyhoach3',
        title: 'Quy hoạch xây dựng, Hạng III',
        subtitle: 'Thi chứng chỉ hành nghề Quy hoạch xây dựng, Hạng III',
        icon: '🏢',
        files: {
            law: ['quyhoach_hang3_PLC.csv', 'quyhoach_hang3_PLR.csv'],
            specialized: ['quyhoach_hang3_CM.csv']
        }
    },
    {
        id: 'quanly3',
        title: 'Quản lý dự án đầu tư xây dựng, Hạng III',
        subtitle: 'Thi chứng chỉ hành nghề Quản lý dự án đầu tư xây dựng, Hạng III',
        icon: '🏢',
        files: {
            law: ['quanlyhang3_PLC.csv', 'quanlyhang3_PLR.csv'],
            specialized: ['quanlyhang3_CM.csv']
        }
    },
    {
        id: 'diahinh3',
        title: 'Khảo sát địa hình, Hạng III',
        subtitle: 'Thi chứng chỉ hành nghề Khảo sát địa hình, Hạng III',
        icon: '🔍',
        files: {
            law: ['dia_hinh_3_PLC.csv', 'dia_hinh_3_PLR.csv'],
            specialized: ['dia_hinh_3_CM.csv']
        }
    },
    {
        id: 'diahinh1',
        title: 'Khảo sát địa hình, Hạng I',
        subtitle: 'Thi chứng chỉ hành nghề Khảo sát địa hình, Hạng I',
        icon: '🔍',
        files: {
            law: ['khaosatdiahinh1_PLC.csv', 'khaosatdiahinh1_PLR.csv'],
            specialized: ['khaosatdiahinh1_CM.csv']
        }
    },
    {
        id: 'duongbo1',
        title: 'Đường bộ, Hạng I',
        subtitle: 'Thi chứng chỉ hành nghề Thiết kế xây XDCT: CT Đường bộ, Hạng I',
        icon: '🚗',
        files: {
            law: ['duongbo1_PLC.csv', 'duongbo1_PLR.csv'],
            specialized: ['duongbo1_CM.csv']
        }
    },
    {
        id: 'hamcau1',
        title: 'Thiết kế xây XDCT: CT Cầu - Hầm, Hạng I',
        subtitle: 'Thi chứng chỉ hành nghề Thiết kế xây XDCT: CT Cầu - Hầm, Hạng I',
        icon: '🌉',
        files: {
            law: ['cauham1_PLC.csv', 'cauham1_PLR.csv'],
            specialized: ['cauham1_CM.csv']
        }
    }
];

export default subjectsConfig;