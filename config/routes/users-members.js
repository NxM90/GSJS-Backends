const express = require("express");
const router = express.Router();
const db = require("../db");
const path = require("path");

// Helper function to format photo URLs correctly
const formatPhotoUrl = (photoPath) => {
  if (!photoPath) return null;

  // Remove any leading slashes and 'public/' prefix
  let cleanPath = photoPath.replace(/^\/+/, "").replace(/^public\//, "");

  // Ensure it starts with 'uploads/'
  if (!cleanPath.startsWith("uploads/")) {
    cleanPath = `uploads/${cleanPath}`;
  }

  console.log("Formatted photo path:", cleanPath);
  return cleanPath;
};

// Get all members with their user information using raw SQL
router.get("/", async (req, res) => {
  try {
    console.log("Fetching all members with user information using raw SQL");
    const { search, divisi_id } = req.query;

    // Build the SQL query with optional filters
    let sql = `
      SELECT 
        m.id, 
        m.foto, 
        m.nama, 
        m.divisi_id, 
        d.nama AS divisi_nama, 
        m.posisi, 
        m.kontak, 
        m.status,
        u.email,
        r.nama AS role_nama
      FROM members m
      LEFT JOIN divisi d ON m.divisi_id = d.id
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN role r ON u.role_id = r.id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      sql += ` AND m.nama LIKE ?`;
      params.push(`%${search}%`);
    }

    if (divisi_id) {
      sql += ` AND m.divisi_id = ?`;
      params.push(divisi_id);
    }

    sql += ` ORDER BY m.nama ASC`;

    console.log("Executing SQL:", sql);
    console.log("With params:", params);

    // Execute the query
    const [members] = await db.query(sql, params);

    console.log(`Found ${members.length} members`);

    // Log the photo paths
    console.log(
      "Photo paths from database:",
      members.map((member) => member.foto)
    );

    // Transform the data for the frontend
    const transformedMembers = members.map((member) => ({
      id: member.id,
      nama: member.nama,
      foto: formatPhotoUrl(member.foto),
      divisi: member.divisi_nama,
      divisi_id: member.divisi_id,
      posisi: member.posisi,
      kontak: member.kontak,
      status: member.status,
      email: member.email,
      role: member.role_nama,
    }));

    res.json(transformedMembers);
  } catch (error) {
    console.error("❌ Error fetching members:", error);
    res
      .status(500)
      .json({
        message: "Terjadi kesalahan saat mengambil data anggota",
        error: error.message,
      });
  }
});

// Get member by ID using raw SQL
router.get("/:id", async (req, res) => {
  try {
    const memberId = req.params.id;

    const sql = `
      SELECT 
        m.id, 
        m.foto, 
        m.nama, 
        m.divisi_id, 
        d.nama AS divisi_nama, 
        m.posisi, 
        m.kontak, 
        m.status,
        u.email,
        r.nama AS role_nama
      FROM members m
      LEFT JOIN divisi d ON m.divisi_id = d.id
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN role r ON u.role_id = r.id
      WHERE m.id = ?
    `;

    const [members] = await db.query(sql, [memberId]);

    if (members.length === 0) {
      return res.status(404).json({ message: "Anggota tidak ditemukan" });
    }

    const member = members[0];

    // Transform the data for the frontend
    const transformedMember = {
      id: member.id,
      nama: member.nama,
      foto: formatPhotoUrl(member.foto),
      divisi: member.divisi_nama,
      divisi_id: member.divisi_id,
      posisi: member.posisi,
      kontak: member.kontak,
      status: member.status,
      email: member.email,
      role: member.role_nama,
    };

    res.json(transformedMember);
  } catch (error) {
    console.error("❌ Error fetching member:", error);
    res
      .status(500)
      .json({
        message: "Terjadi kesalahan saat mengambil data anggota",
        error: error.message,
      });
  }
});

// Delete member using raw SQL
router.delete("/:id", async (req, res) => {
  try {
    const memberId = req.params.id;

    // First, check if the member exists
    const [members] = await db.query("SELECT * FROM members WHERE id = ?", [
      memberId,
    ]);

    if (members.length === 0) {
      return res.status(404).json({ message: "Anggota tidak ditemukan" });
    }

    const member = members[0];

    // Start a transaction
    await db.query("START TRANSACTION");

    try {
      // Delete from members table
      await db.query("DELETE FROM members WHERE id = ?", [memberId]);

      // If there's a user_id, delete from users table
      if (member.user_id) {
        await db.query("DELETE FROM users WHERE id = ?", [member.user_id]);
      }

      // Commit the transaction
      await db.query("COMMIT");

      res.json({ message: "Anggota berhasil dihapus" });
    } catch (error) {
      // Rollback the transaction if there's an error
      await db.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("❌ Error deleting member:", error);
    res
      .status(500)
      .json({
        message: "Terjadi kesalahan saat menghapus anggota",
        error: error.message,
      });
  }
});

// Update member status
router.post("/:id/update-status", async (req, res) => {
  try {
    const memberId = req.params.id;
    const { status } = req.body;

    if (!status || !["Active", "Inactive"].includes(status)) {
      return res
        .status(400)
        .json({
          message: "Status tidak valid. Gunakan 'Active' atau 'Inactive'",
        });
    }

    // Update the member status
    await db.query("UPDATE members SET status = ? WHERE id = ?", [
      status,
      memberId,
    ]);

    res.json({ message: `Status anggota berhasil diubah menjadi ${status}` });
  } catch (error) {
    console.error("❌ Error updating member status:", error);
    res
      .status(500)
      .json({
        message: "Terjadi kesalahan saat mengubah status anggota",
        error: error.message,
      });
  }
});

module.exports = router;
