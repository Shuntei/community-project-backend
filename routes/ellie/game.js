import express, { response } from "express";
import db from "../../utils/ellie/mysql2-connect.js";
import dayjs from "dayjs";
const app = express();
//const server = require('http').Server(app)
const router = express.Router();

// router.get("/ruins_final", async (req, res) => {
//   try {
//     const sql = "SELECT * FROM `gm_achieved`";
//     const [rows, fields] = await db.query(sql);

//     res.json(rows);
//   } catch (e) {
//     console.log(e);
//   }
// });

router.post("/ruins_final", async (req, res) => {
  try {
    const { missionId, newValue, user_id } = req.body;

    console.log({ missionId, newValue });

    const sql =
      "UPDATE `gm_achieved` SET `activate`=? WHERE `mission_id`=? AND `user_id` = ? ";

    const [result] = await db.query(sql, [newValue, missionId, user_id]);
    console.log(result);

    res
      .status(200)
      .json({ message: "Achievement updated successfully.", ...result });
  } catch (error) {
    console.error("Error updating achievement:", error);
    res.status(500).json({ error: "Failed to update achievement." });
  }
});

router.post("/ruins_final/gm_note", async (req, res) => {
  let output = {
    success: false,
    result: [],
  };
  // res.send('helllo')
  // res.json({title:1, content:2})
  try {
    const { user_id, title, memo } = req.body;

    console.log(req.body);

    const addNote =
      "INSERT INTO `gm_note`( `user_id`, `title`, `memo`, `time`) VALUES ( ?, ?, ?, NOW())";

    const [result] = await db.query(addNote, [user_id, title, memo]);
    console.log(result);
    if (!!result.affextedRows) {
      return res.json({ success: false });
    }
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error updating note", error);
    res.status(500).json({ error: "Failed to update note." });
  }
});

router.post("/ruins_final/gm_note_edit", async (req, res) => {
  let output = {
    success: false,
    result: [],
  };
  // res.send('helllo')
  // res.json({title:1, content:2})
  try {
    const { user_id, title, memo, note_id } = req.body;

    console.log(req.body);

    const addNote =
      // "UPDATE `gm_note`(`title`, `memo`, `time`) VALUES ( ?, ?, NOW()) WHERE `note_id`= ? ";
      `UPDATE gm_note
      SET title = ?, memo = ?, time = NOW()
      WHERE note_id = ? `;

    const [result] = await db.query(addNote, [title, memo, note_id]);
    // console.log(result);
    if (!!result.affextedRows) {
      return res.json({ success: false });
    }
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error updating note", error);
    res.status(500).json({ error: "Failed to update note." });
  }
});

//刪除note
router.delete("/ruins_final/delete_form", async (req, res) => {
  try {
    const { note_id } = req.body;
    console.log(note_id);
    const deleteQuery = `DELETE FROM gm_note WHERE note_id = ?`;

    const [result] = await db.query(deleteQuery, [note_id]);

    if (result.affectedRows > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error("Error deleting form", error);
    res.status(500).json({ error: "Failed to delete form." });
  }
});

// //取得memo
// router.get("/gm_note", async (req, res)=>{
//   let output = {
//     success: false,
//     rows: [],
//   };
//   // 取得 note_id 去搜尋
//   const note_id = req.params.note_id;

//   const sql =
//     "SELECT `note_id`, `user_id`, `title`,`memo` FROM `gm_note` WHERE `user_id` = ? ";

//     const [rows] = await db.query(sql, [mid]);
//   if (!rows.length) {
//     return res.json({ success: false });
//   }

//   res.json({ success: true, rows });
// })

//取得title
router.get("/gm_note/:user_id", async (req, res) => {
  let output = {
    success: false,
    rows: [],
  };
  // 取得 user_id 去搜尋
  const user_id = req.params.user_id;

  const sql =
    "SELECT `note_id`, `title`,`memo` FROM `gm_note` WHERE `user_id` = ? ";

  const [rows] = await db.query(sql, [user_id]);
  if (!rows.length) {
    return res.json({ success: false });
  }

  res.json({ success: true, rows });
});

// //check note or insert
// router.get("/check/gm_note/:user_id", async (req, res) => {
//   let output = {
//     success: false,
//     rows: [],
//   };

//   // 取得 user_id 去搜尋
//   const user_id = +req.params.user_id || 0;

//   // find user's note
//   const t_sql = "SELECT COUNT(1) myCount FROM `gm_note` WHERE `user_id` = ?";

//   const [rows] = await db.query(t_sql, [user_id]);
//   let result = {};
//   if (user_id && rows[0].myCount < 1) {
//     const sql = `INSERT INTO gm_note (user_id, title, memo) VALUES
//     (${user_id}, 'Hi there', 'Welcome here.'),
//     (${user_id}, 'some thoughts', 'Type something here.');`;
//     console.log(sql);
//     [result] = await db.query(sql);

//   }

//   res.json({ success: true, result });
// });

// +++++++++++++++++++++++++++++++

// //取得mission
// router.get("/gm_mission", async (req, res) => {
//   let output = {
//     success: false,
//     rows: [],
//   };
//   // 取得 mission_id 去搜尋
//   const mission_id = req.params.mission_id;

//   const sql =
//     "SELECT `mission_id`,`mission_name`,`activate` FROM `gm_mission` WHERE `user_id` = 1 ";

//   const [rows] = await db.query(sql);
//   if (!rows.length) {
//     return res.json({ success: false });
//   }

//   res.json({ success: true, rows });
// });

// //check missions or insert
// router.get("/check/gm_mission/:user_id", async (req, res) => {
//   let output = {
//     success: false,
//     rows: [],
//   };

//   // 取得 mission_id 去搜尋
//   const user_id = +req.params.user_id || 0;

//   // find user's missions
//   const t_sql = "SELECT COUNT(1) myCount FROM `gm_mission` WHERE `user_id` = ?";

//   const [rows] = await db.query(t_sql, [user_id]);
//   let result = {};
//   if (user_id && rows[0].myCount < 1) {
//     const sql = `INSERT INTO  gm_mission  ( user_id, mission_name) VALUES
//     (${user_id}, 'Edit your avatar.'),
//     (${user_id}, 'You ve found a LINK.'),
//     (${user_id}, 'Teleport yourself.'),
//     (${user_id}, 'Have you seen HomePage'),
//     (${user_id}, 'important member page'),
//     (${user_id}, 'View SNS'),
//     (${user_id}, 'Love window shopping'),
//     (${user_id}, 'tour tour tour'),
//     (${user_id}, 'LIVE WAREHOUSE.'),
//     (${user_id}, 'shut up and pay attention'),
//     (${user_id}, 'tic-tac-toe 01'),
//     (${user_id}, 'tic-tac-toe harder'),
//     (${user_id}, 'Done all.');`;
//     console.log(sql);
//     [result] = await db.query(sql);
//   }
//   /*
//   const sql =
//     "SELECT `mission_id`,`mission_name`,`activate` FROM `gm_mission` WHERE `user_id` = 1 ";

//   const [rows] = await db.query(sql);
//   if (!rows.length) {
//     return res.json({ success: false });
//   }
// */
//   res.json({ success: true, result });
// });

//取得 user_achieved
router.get("/gm_achieved/:user_id", async (req, res) => {
  let output = {
    success: false,
    rows: [],
  };
  // 取得 achieved_id 去搜尋
  const user_id = req.params.user_id;

  const sql =
    "SELECT `achieved_id`,`mission_id`,`mission_name`,`title`,`description`,`activate` FROM `gm_achieved` WHERE `user_id` = ? ";

  const [rows] = await db.query(sql, [user_id]);
  if (!rows.length) {
    return res.json({ success: false });
  }

  res.json({ success: true, rows });
});

//check achieved or insert
router.get("/check/gm_achieved/:user_id", async (req, res) => {
  let output = {
    success: false,
    rows: [],
  };

  // 取得 user_id 去搜尋
  const user_id = +req.params.user_id || 0;

  // find user's achieved
  const t_sql =
    "SELECT COUNT(1) myCount FROM `gm_achieved` WHERE `user_id` = ?";

  const [rows] = await db.query(t_sql, [user_id]);
  let result = {};
  if (user_id && rows[0].myCount < 1) {
    const sql = `INSERT INTO  gm_achieved  ( user_id, mission_id, mission_name, title, description, activate) VALUES
    (${user_id}, 1, 'Mission 001', 'Create account.','Game editing features are unlocked.',1),
    (${user_id}, 2, 'Mission 002', 'Found a Portal.','Awesome You found a Portal.',0),
    (${user_id}, 3, 'Mission 003', 'Teleport yourself.','Link to some where else',0),
    (${user_id}, 4, 'Mission 004', 'Rubbish?','Yes it smells rotten.',0),
    (${user_id}, 5, 'Mission 005', 'Its construction.','Do not stand too close.',0),
    (${user_id}, 6, 'Mission 006', 'Sooo Annoying.','Clap to welcome.',0),
    (${user_id}, 7, 'Mission 007', 'Sandwitch','Whatever',0),
    (${user_id}, 8, 'Mission 008', 'tour tour tour','Kill me',0),
    (${user_id}, 9, 'Mission 009', 'NOODLES.','Im hangery',0),
    (${user_id}, 10, 'Mission 010', 'Come closer.','Close enough.',0);`;
    // (${user_id}, 12, 'Mission 012', 'shut up and pay attention'),
    // (${user_id}, 13, 'Mission 013', 'Done all.');`;
    console.log(sql);
    [result] = await db.query(sql);
  }
  /*
  const sql =
    "SELECT `mission_id`,`mission_name`,`activate` FROM `gm_mission` WHERE `user_id` = 1 ";

  const [rows] = await db.query(sql);
  if (!rows.length) {
    return res.json({ success: false });
  }
*/
  res.json({ success: true, result });
});

//

export default router;
