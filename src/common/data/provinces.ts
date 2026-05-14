export interface Province {
    name: string;
    code: string;
}

export const VIETNAM_PROVINCES: Province[] = [
    { name: "An Giang", code: "AG" },
    { name: "Bắc Ninh", code: "BN" },
    { name: "Cà Mau", code: "CM" },
    { name: "Cao Bằng", code: "CB" },
    { name: "Đắk Lắk", code: "DL" },
    { name: "Đồng Nai", code: "DoN" },
    { name: "Đồng Tháp", code: "DT" },
    { name: "Điện Biên", code: "DB" },
    { name: "Gia Lai", code: "GL" },
    { name: "Hà Tĩnh", code: "HT" },
    { name: "Hưng Yên", code: "HY" },
    { name: "Khánh Hòa", code: "KH" },
    { name: "Lai Châu", code: "LC" },
    { name: "Lâm Đồng", code: "LD" },
    { name: "Lạng Sơn", code: "LS" },
    { name: "Lào Cai", code: "LC" },
    { name: "Nghệ An", code: "NA" },
    { name: "Ninh Bình", code: "NB" },
    { name: "Phú Thọ", code: "PT" },
    { name: "Quảng Ngãi", code: "QN" },
    { name: "Quảng Ninh", code: "QI" },
    { name: "Quảng Trị", code: "QT" },
    { name: "Sơn La", code: "SL" },
    { name: "Tây Ninh", code: "TN" },
    { name: "Thái Nguyên", code: "TY" },
    { name: "Thanh Hóa", code: "TNG" },
    { name: "Thành phố Cần Thơ", code: "CT" },
    { name: "Thành phố Đà Nẵng", code: "DN" },
    { name: "Thành phố Hà Nội", code: "HN" },
    { name: "Thành phố Hải Phòng", code: "HP" },
    { name: "Thành phố Hồ Chí Minh", code: "HCM" },
    { name: "Thành phố Huế", code: "HU" },
    { name: "Tuyên Quang", code: "TQ" },
    { name: "Vĩnh Long", code: "VL" }
].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
