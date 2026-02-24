import contactMessageService from "../../services/contact/contactMessage.service.js";
import {
  catchAsync,
  successResponse,
  successResponseWithPagination,
} from "../../utils/index.js";

/**
 * Contact Message Controller
 * Xử lý HTTP requests cho contact messages
 */

/**
 * @desc    Tạo contact message mới (từ form liên hệ)
 * @route   POST /api/contact
 * @access  Public
 */
export const createContactMessage = catchAsync(async (req, res) => {
  const contactMessage = await contactMessageService.createContactMessage(
    req.body,
    req.user || null,
  );

  successResponse(
    res,
    contactMessage,
    "Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi trong thời gian sớm nhất.",
    201,
  );
});

/**
 * @desc    Lấy danh sách contact messages (Admin)
 * @route   GET /api/contact
 * @access  Private/Admin
 */
export const getAllContactMessages = catchAsync(async (req, res) => {
  const result = await contactMessageService.getContactMessages({}, req.query);

  successResponseWithPagination(
    res,
    result.items,
    result.pagination,
    "Lấy danh sách tin nhắn liên hệ thành công",
  );
});

/**
 * @desc    Lấy chi tiết contact message (Admin)
 * @route   GET /api/contact/:contactId
 * @access  Private/Admin
 */
export const getContactMessageById = catchAsync(async (req, res) => {
  const message = await contactMessageService.getContactMessageById(
    req.params.contactId,
  );

  successResponse(res, message, "Lấy thông tin tin nhắn liên hệ thành công");
});

/**
 * @desc    Cập nhật trạng thái contact message (Admin)
 * @route   PATCH /api/contact/:contactId/status
 * @access  Private/Admin
 */
export const updateContactStatus = catchAsync(async (req, res) => {
  const { status, admin_note } = req.body;
  const adminNote = admin_note;
  const message = await contactMessageService.updateContactStatus(
    req.params.contactId,
    status,
    adminNote,
    req.user?.user_id || null,
  );

  successResponse(res, message, "Cập nhật trạng thái thành công");
});

/**
 * @desc    Xóa contact message (Admin)
 * @route   DELETE /api/contact/:contactId
 * @access  Private/Admin
 */
export const deleteContactMessage = catchAsync(async (req, res) => {
  const result = await contactMessageService.deleteContactMessage(
    req.params.contactId,
  );

  successResponse(res, result, "Xóa tin nhắn liên hệ thành công");
});

/**
 * @desc    Lấy thống kê contact messages (Admin)
 * @route   GET /api/contact/statistics
 * @access  Private/Admin
 */
export const getContactStatistics = catchAsync(async (req, res) => {
  const stats = await contactMessageService.getStatistics();

  successResponse(res, stats, "Lấy thống kê tin nhắn liên hệ thành công");
});
