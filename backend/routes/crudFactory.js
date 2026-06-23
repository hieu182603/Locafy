const express = require('express');

module.exports = function makeCrudRouter(Model) {
  const router = express.Router();

  // GET ALL
  router.get('/', async (req, res) => {
    try {
      // Build query from request query parameters (e.g., ownerUsername, renterEmail, etc.)
      const query = {};
      for (const [key, val] of Object.entries(req.query)) {
        if (val !== undefined && val !== '') {
          // Support boolean conversion
          if (val === 'true') query[key] = true;
          else if (val === 'false') query[key] = false;
          else query[key] = val;
        }
      }
      const items = await Model.find(query).sort({ createdAt: -1 });
      res.status(200).json(items);
    } catch (error) {
      console.error(`GET / error for model ${Model.modelName}:`, error);
      res.status(500).json({ error: error.message || 'Lỗi hệ thống khi tải danh sách.' });
    }
  });

  // GET ONE
  router.get('/:id', async (req, res) => {
    try {
      const item = await Model.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ error: 'Không tìm thấy bản ghi.' });
      }
      res.status(200).json(item);
    } catch (error) {
      console.error(`GET /:id error for model ${Model.modelName}:`, error);
      res.status(500).json({ error: error.message || 'Lỗi hệ thống khi tải chi tiết.' });
    }
  });

  // POST / UPSERT
  router.post('/', async (req, res) => {
    try {
      const body = req.body;
      const id = body.id || body._id || body.username; // Support custom string primary keys
      
      if (id) {
        body._id = id;
        const updated = await Model.findByIdAndUpdate(id, body, { upsert: true, new: true, runValidators: true });
        return res.status(200).json(updated);
      }

      // Generate a random string ID if model doesn't automatically generate ObjectId
      if (Model.schema.options._id === false) {
        const prefix = Model.modelName.toLowerCase().substring(0, 3);
        body._id = `${prefix}-${Date.now()}`;
      }

      const newItem = new Model(body);
      await newItem.save();
      res.status(201).json(newItem);
    } catch (error) {
      console.error(`POST / error for model ${Model.modelName}:`, error);
      res.status(500).json({ error: error.message || 'Lỗi hệ thống khi lưu dữ liệu.' });
    }
  });

  // PUT / UPDATE
  router.put('/:id', async (req, res) => {
    try {
      const updated = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!updated) {
        return res.status(404).json({ error: 'Không tìm thấy bản ghi để cập nhật.' });
      }
      res.status(200).json(updated);
    } catch (error) {
      console.error(`PUT /:id error for model ${Model.modelName}:`, error);
      res.status(500).json({ error: error.message || 'Lỗi hệ thống khi cập nhật.' });
    }
  });

  // DELETE
  router.delete('/:id', async (req, res) => {
    try {
      const deleted = await Model.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Không tìm thấy bản ghi để xóa.' });
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error(`DELETE /:id error for model ${Model.modelName}:`, error);
      res.status(500).json({ error: error.message || 'Lỗi hệ thống khi xóa.' });
    }
  });

  return router;
};
