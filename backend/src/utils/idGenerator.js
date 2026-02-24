const buildRegex = (prefix, digits) => new RegExp(`^${prefix}\\d{${digits}}$`);

export const generateNextId = async (model, field, prefix, digits = 6) => {
  if (!model || !field || !prefix) {
    throw new Error("Missing parameters for generateNextId");
  }

  const regex = buildRegex(prefix, digits);
  const last = await model
    .findOne({ [field]: { $regex: regex } })
    .sort({ [field]: -1 })
    .select(field)
    .lean();

  const lastValue = last?.[field];
  const lastNumber = lastValue
    ? parseInt(String(lastValue).replace(prefix, ""), 10)
    : 0;
  const nextNumber = lastNumber + 1;

  return `${prefix}${String(nextNumber).padStart(digits, "0")}`;
};
