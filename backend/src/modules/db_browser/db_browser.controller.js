import dbBrowserService from "./db_browser.service.js";
import { catchAsync } from "../../utils/catchAsync.js";

/**
 * @route   GET /api/db/collections
 * @desc    Get list of all collections with counts
 * @access  Private (requires auth)
 */
const getCollections = catchAsync(async (req, res) => {
  const collections = await dbBrowserService.getCollections();

  res.status(200).json({
    success: true,
    message: "Collections retrieved successfully",
    data: collections,
  });
});

/**
 * @route   GET /api/db/collections/:name
 * @desc    Get documents from a collection with pagination, filtering, sorting
 * @access  Private (requires auth)
 */
const getCollectionData = catchAsync(async (req, res) => {
  const { name } = req.params;
  const { page, limit, sortField, sortOrder, q, fields, filter } = req.query;

  const options = {
    page,
    limit,
    sortField,
    sortOrder,
    q,
    fields,
    filter,
  };

  const result = await dbBrowserService.getCollectionData(name, options);

  res.status(200).json({
    success: true,
    message: "Collection data retrieved successfully",
    data: result,
  });
});

/**
 * @route   GET /api/db/collections/:name/:id
 * @desc    Get single document by ID
 * @access  Private (requires auth)
 */
const getDocumentById = catchAsync(async (req, res) => {
  const { name, id } = req.params;

  const document = await dbBrowserService.getDocumentById(name, id);

  res.status(200).json({
    success: true,
    message: "Document retrieved successfully",
    data: document,
  });
});

export { getCollections, getCollectionData, getDocumentById };
