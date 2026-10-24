//every function receives the mongoose model it works on
//options: select, populate, lean, skip, sort, limit

//1: read
export const findById = async ({ id, options = {}, model }) => {
  const doc = model.findById(id);
  if (options.select) doc.select(options.select);
  if (options.populate) doc.populate(options.populate);
  if (options.lean) doc.lean(options.lean);
  return await doc.exec();
};

export const findOne = async ({ filter = {}, options = {}, model } = {}) => {
  const doc = model.findOne(filter);
  if (options.select) doc.select(options.select);
  if (options.populate) doc.populate(options.populate);
  if (options.lean) doc.lean(options.lean);
  return await doc.exec();
};

export const find = async ({ filter = {}, options = {}, model } = {}) => {
  const doc = model.find(filter);
  if (options.select) doc.select(options.select);
  if (options.populate) doc.populate(options.populate);
  if (options.skip) doc.skip(options.skip);
  if (options.sort) doc.sort(options.sort);
  if (options.limit) doc.limit(options.limit);
  if (options.lean) doc.lean(options.lean);
  return await doc.exec();
};

export const countDocuments = async ({ filter = {}, model } = {}) => {
  return await model.countDocuments(filter);
};

//2: pagination, returns { docsCount, limit, pages, currentPage, result }
export const paginate = async ({
  filter = {},
  options = {},
  page = 1,
  size = 10,
  model,
} = {}) => {
  const currentPage = Math.max(Math.floor(Number(page)) || 1, 1);
  const limit = Math.max(Math.floor(Number(size)) || 10, 1);

  const [docsCount, result] = await Promise.all([
    countDocuments({ filter, model }),
    find({
      filter,
      options: { ...options, limit, skip: (currentPage - 1) * limit },
      model,
    }),
  ]);

  return {
    docsCount,
    limit,
    pages: Math.ceil(docsCount / limit),
    currentPage,
    result,
  };
};

//3: create
export const create = async ({ data, options, model }) => {
  const isMany = Array.isArray(data);
  const docs = (await model.create(isMany ? data : [data], options)) || [];
  return isMany ? docs : docs[0];
};

export const createOne = async ({ model, data = {}, options } = {}) => {
  return await create({ model, data, options });
};

//4: update
export const updateOne = async ({ filter, update, options, model } = {}) => {
  return await model.updateOne(filter, update, options);
};

//returns the NEW document, or null when nothing matched the filter
export const findOneAndUpdate = async ({
  filter,
  update,
  options,
  model,
} = {}) => {
  return await model.findOneAndUpdate(filter, update, {
    new: true,
    runValidators: true,
    ...options,
  });
};

export const findByIdAndUpdate = async ({ id, update, options, model }) => {
  return await model.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
    ...options,
  });
};

//5: delete
export const deleteOne = async ({ filter, model }) => {
  return await model.deleteOne(filter);
};

export const deleteMany = async ({ filter, model }) => {
  return await model.deleteMany(filter);
};
