export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export const SUPPORT_FAQS: FAQItem[] = [
  {
    id: "faq-start-exam",
    question: "Làm thế nào để bắt đầu làm một đề thi?",
    answer:
      "Bạn chỉ cần truy cập mục Đề thi trên thanh điều hướng, duyệt theo môn học hoặc danh mục phù hợp. Với các đề thi cho phép khách làm thử, bạn có thể nhấn 'Bắt đầu làm bài' ngay. Đối với các đề thi chính thức, bạn cần đăng nhập tài khoản học sinh (qua Google) để hệ thống lưu điểm và ghi nhận tiến độ vào lịch sử học tập.",
  },
  {
    id: "faq-auto-submitted",
    question: "Tại sao bài thi của tôi bị tự động nộp (Auto-submitted)?",
    answer:
      "Hệ thống sẽ tự động thu bài trong 3 trường hợp: (1) Hết thời gian làm bài quy định của đề thi; (2) Vi phạm quy chế thi (thoát chế độ toàn màn hình hoặc chuyển tab / ẩn trình duyệt quá thời gian ân hạn cho phép); hoặc (3) Tài khoản học sinh bị khóa trong lúc đang thi. Mọi đáp án bạn đã chọn trước thời điểm nộp đều được lưu trữ và tính điểm an toàn.",
  },
  {
    id: "faq-view-results",
    question: "Tôi có thể xem lại lịch sử và kết quả chi tiết các bài thi ở đâu?",
    answer:
      "Ngay sau khi nộp bài, bạn sẽ nhận được bảng tổng kết điểm số kèm đáp án chi tiết và giải thích (nếu đề thi cho phép). Ngoài ra, học sinh đã đăng nhập có thể truy cập trang Lịch sử (/student/history) trên thanh điều hướng bất kỳ lúc nào để xem lại danh sách tất cả các lượt thi, phổ điểm và chi tiết từng câu trả lời.",
  },
];
