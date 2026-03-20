import express from "express";
import * as guestCustomerController from "../../controllers/guest/guest-customer.controller.js";
import * as guestCustomerValidator from "../../validators/guest/guest-customer.validator.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { requireAdmin } from "../../middlewares/role.middleware.js";

const router = express.Router();

/**
 * Guest Customer Routes
 *
 * @description Routes để quản lý khách hàng không đăng nhập
 * @baseRoute /api/guest-customers
 */

/**
 * @route GET /api/guest-customers/statistics
 * @desc Lấy thống kê guest customers
 * @access Public
 */
router.get("/statistics", guestCustomerController.getStatistics);

/**
 * @route GET /api/guest-customers/phone/:phone
 * @desc Tìm guest customer theo phone
 * @access Public
 */
router.get(
  "/phone/:phone",
  validate(guestCustomerValidator.findByPhone),
  guestCustomerController.findByPhone,
);

/**
 * @route POST /api/guest-customers/find-or-create
 * @desc Tìm hoặc tạo guest customer
 * @access Public
 */
router.post(
  "/find-or-create",
  validate(guestCustomerValidator.createGuestCustomer),
  guestCustomerController.findOrCreate,
);

/**
 * @route POST /api/guest-customers
 * @desc Tạo guest customer mới
 * @access Public
 */
router.post(
  "/",
  validate(guestCustomerValidator.createGuestCustomer),
  guestCustomerController.createGuestCustomer,
);

/**
 * @route GET /api/guest-customers
 * @desc Lấy danh sách guest customers với phân trang và lọc
 * @access Public (hoặc Admin - tùy yêu cầu)
 */
router.get(
  "/",
  validate(guestCustomerValidator.getGuestCustomersList),
  guestCustomerController.getGuestCustomers,
);

/**
 * @route POST /api/guest-customers/:guestId/invite-register
 * @desc Gui email moi guest customer dang ky tai khoan
 * @access Admin+
 */
router.post(
  "/:guestId/invite-register",
  protect,
  requireAdmin,
  validate(guestCustomerValidator.inviteRegister),
  guestCustomerController.inviteRegister,
);

/**
 * @route GET /api/guest-customers/:guestId
 * @desc Lấy thông tin guest customer theo ID
 * @access Public
 */
router.get(
  "/:guestId",
  validate(guestCustomerValidator.getGuestCustomer),
  guestCustomerController.getGuestCustomer,
);

/**
 * @route PUT /api/guest-customers/:guestId
 * @desc Cập nhật thông tin guest customer
 * @access Public
 */
router.put(
  "/:guestId",
  validate(guestCustomerValidator.updateGuestCustomer),
  guestCustomerController.updateGuestCustomer,
);

/**
 * @route DELETE /api/guest-customers/:guestId
 * @desc Xóa guest customer
 * @access Admin only (có thể thêm middleware auth.isAdmin)
 */
router.delete(
  "/:guestId",
  validate(guestCustomerValidator.deleteGuestCustomer),
  guestCustomerController.deleteGuestCustomer,
);

/**
 * @route POST /api/guest-customers/:guestId/orders
 * @desc Ghi nhận đơn hàng mới cho guest customer
 * @access Public
 */
router.post(
  "/:guestId/orders",
  validate(guestCustomerValidator.recordOrder),
  guestCustomerController.recordOrder,
);

export default router;
