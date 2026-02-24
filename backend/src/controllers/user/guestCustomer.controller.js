import guestCustomerService from "../../services/user/guestCustomer.service.js";
import { catchAsync, successResponse } from "../../utils/index.js";

/**
 * @desc    Create or update guest customer
 * @route   POST /api/guest-customers
 * @access  Public
 */
export const createGuestCustomer = catchAsync(async (req, res) => {
  const guestCustomer = await guestCustomerService.createOrUpdateGuest(req.body);

  successResponse(
    res,
    guestCustomer,
    "Lưu thông tin khách hàng thành công",
    201,
  );
});
