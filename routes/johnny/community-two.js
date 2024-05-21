import express from "express";
import cors from "cors";
import db from "../../utils/mysql2-connect.js";
import uploadImgs from "../../utils/johnny/upload-imgs.js";
import bodyParser from "body-parser";


const router = express.Router();

router.use(cors());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
// 靜態文件,存放目錄
router.use(express.static("routes/johnny/upload"));

router.put("/edit/:postId?", uploadImgs.single("photo"), async (req, res) => {
  const output = {
    success: false,
    bodyData: { body: req.body, file: req.file },
    errors: {},
  };
  // console.log("the bodyData: ", output.bodyData);

  let postId = +req.params.postId || 0;
  // console.log(postId);

  let result = {};
  // const sql = "INSERT INTO `sn_posts` SET ? ";
  try {
    // console.log("this is photo:", req.file);

    if (!req.file) {
      const sql = `UPDATE sn_posts SET title=? , content=?, board_id=?, emotion=?, tags=? WHERE post_id=${postId}`;
      [result] = await db.query(sql, [
        req.body.title,
        req.body.content,
        req.body.boardId,
        req.body.emotion,
        req.body.tags,
      ]);
    }
    if (req.file) {
      // console.log("來到圖片區但是沒有圖片");
      const newFilePath = req.file.path.slice(21);
      // "http://localhost:3001/community/" + req.file.path.slice(21);
      console.log("newFilePath", newFilePath);
      // http://localhost:3005/johnny/3a5a7ce6-ca08-4484-9de8-6c22d7448540.jpg 圖片顯示位置
      req.body.image_url = newFilePath; // 圖片的路徑保存在 newFilePath 中
      const sql = `UPDATE sn_posts SET title=?, content=?, image_url=?, board_id=?, emotion=?, tags=? WHERE post_id=${postId}`;
      [result] = await db.query(sql, [
        req.body.title,
        req.body.content,
        req.body.image_url,
        req.body.boardId,
        req.body.emotion,
        req.body.tags,
      ]);
    }

    // console.log("reqBody:", req.body);
    output.success = !!result.affectedRows;
  } catch (err) {
    console.log(err);
  }
  // console.log(output);
  res.json(output);
});

router.get("/toggle-like", async (req, res) => {
  // http://localhost:3001/community/toggle-like
  let postId = +req.query.postId;
  let userId = +req.query.userId;

  const output = {
    success: false,
    action: "",
    likes: "",
    error: "",
    likesCountError: "",
    code: 0,
    rows: "",
    userIdExist: "",
  };

  // console.log(postId);
  // console.log(userId);
  // 確認有無這則貼文的like
  if (!postId || !userId) {
    return;
  } else {
    // console.log(`postId: ${postId} came, keep going`);
  }

  const isLikeRowsSql = `SELECT pl.like_id, ps.post_id, pl.user_id FROM sn_post_likes pl 
  INNER JOIN sn_posts ps ON pl.post_id = ps.post_id WHERE ps.post_id=?`;
  // 先找出該like列表
  const [likeRows, field] = await db.query(isLikeRowsSql, [postId]);

  console.log("likeRows", likeRows);
  // console.log("field:", field);
  const userIdExist = likeRows.map((v) => v.user_id).includes(userId);
  // console.log("userIdExist:", userIdExist);

  if (likeRows.length && userIdExist) {
    const unlikeSql = `DELETE FROM sn_post_likes WHERE post_id=${postId} AND user_id=${userId}`;
    const [result] = await db.query(unlikeSql);
    if (result.affectedRows) {
      output.success = true;
      output.action = "remove";
      output.rows = likeRows;
    } else {
      // 萬一沒有刪除
      output.code = 410;
      output.error = "無法移除";
      return res.json(output);
    }
  }

  if (!likeRows.length || (likeRows.length && !userIdExist)) {
    // console.log("why", likeRows[0].user_id);

    const likeSql = `INSERT INTO sn_post_likes (post_id, user_id) VALUES (${postId}, ${userId})`;
    const [result] = await db.query(likeSql);
    if (result.affectedRows) {
      output.success = true;
      output.action = "add";
      output.rows = likeRows;
    } else {
      // 萬一沒有新增成功
      output.code = 420;
      output.error = "無法按讚";
      return res.json(output);
    }
  }

  const likesCount = `SELECT COUNT(1) FROM sn_post_likes WHERE post_id=${postId}`;
  const [result] = await db.query(likesCount);
  const likes = result[0]["COUNT(1)"];
  // console.log(likes);

  const addResultToPosts = `UPDATE sn_posts SET likes=${likes} WHERE post_id=${postId}`;
  const [likesCounted] = await db.query(addResultToPosts);
  // console.log(likesCounted);
  if (likesCounted.affectedRows) {
    output.success = true;
    output.action = "counted";
    output.likes = "總讚數成功";
  } else {
    // 萬一沒有更新讚數成功
    output.code = 430;
    output.likesCountError = "無法更新總讚數";
    return res.json(output);
  }
  // console.log(output);
  res.json(output);
});

router.get("/like-state/:postId?", async (req, res) => {
  // http://localhost:3001/community/toggle-like
  let postId = +req.params.postId;
  const output = {
    success: false,
    action: "",
    error: "",
    code: 0,
    rows: "",
  };
  console.log("postId(toggle-like)", postId);
  // 確認有無這則貼文的like
  if (!postId) {
    return;
  } else {
    // console.log(`postId: ${postId} came, keep going`);
  }
  const isLikeRowsSql = `SELECT pl.like_id, ps.post_id, pl.user_id FROM sn_post_likes pl 
  INNER JOIN sn_posts ps ON pl.post_id = ps.post_id WHERE ps.post_id=?`;
  const [likeRows, field] = await db.query(isLikeRowsSql, [postId]);
  // console.log("field:", field);

  output.rows = likeRows;

  // console.log(output);
  res.json(output);
});

// 初始化留言列表&留言數量
router.get("/comment/:postId?", async (req, res) => {
  const output = {
    success: false,
    whatPostIdIs: +req.params.postId,
    rows: [],
    totalRows: "",
  };
  let postId = +req.params.postId;

  if (postId) {
    const sql = `SELECT sn_comments.*, mb_user.username FROM sn_comments LEFT JOIN sn_posts USING(post_id) 
                LEFT JOIN mb_user ON sn_comments.user_id = mb_user.id
                WHERE post_id=${postId} ORDER BY sn_comments.comment_id DESC`;
    const [result] = await db.query(sql);
    console.log("comment content: ", result);
    if (result.length > 0) {
      output.rows = result;
      output.success = true;
    } else {
      output.success = false;
    }
  } else {
    output.errors = "沒有postId";
  }
  // 留言數統計數,只在單篇中顯示(非列表)
  const totalRowsSql = `SELECT COUNT(1) FROM sn_comments LEFT JOIN sn_posts USING(post_id) WHERE post_id=${postId} ORDER BY sn_comments.comment_id;`;
  const [totalRows] = await db.query(totalRowsSql);
  // console.log(totalRows);
  output.totalRows = totalRows;

  res.json(output);
});

// 顯示留言內容(用於編輯)
router.get("/selectedcm/:commentId", async (req, res) => {
  let commentId = +req.params.commentId;

  if (commentId) {
    const sql = `SELECT * FROM sn_comments WHERE comment_id=${commentId}`;
    const [result] = await db.query(sql);
    res.json(result);
  } else {
    res.json("沒有 commentId");
  }
});

// add notification
const addNotification = async (id, message, resourceId, insertId) => {
  console.log(id);
  try {
    const sql = `SELECT mb_user.* 
    FROM sn_posts
    JOIN mb_user ON sn_posts.user_id = mb_user.id
    WHERE sn_posts.post_id=?`;
    const [rows] = await db.query(sql, resourceId);

    const addSql = `INSERT INTO mb_notifications 
    (user_id, 
      category, 
      message, 
      created_at, 
      isRead, 
      sender_id, 
      resource_id,
      comment_id) 
      VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)`;
    const [result] = await db.query(addSql, [
      rows[0].id,
      "comment",
      message,
      false, 
      id,
      resourceId,
      insertId
    ]);
    console.log(result);
    return true;
  } catch (error) {
    console.log("Failed to insert comment notification:", error);
    return false;
  }
};

// 新增留言
router.post("/cmadd", uploadImgs.single("photo"), async (req, res) => {
  const output = {
    success: false,
    bodyData: { body: req.body },
    errors: {},
    notification: false,
  };
  // console.log("the bodyData: ", output.bodyData);

  let result = {};
  try {
    // console.log("this is photo:", req.file);
    
    if (!req.body.userId) {
      output.success = false;
      output.errors = "no user id";
      return;
    }

    if (!req.file) {
      const sql =
        "INSERT INTO `sn_comments` ( `content`, `post_id`, `user_id`) VALUES ( ?, ?, ? )";
      [result] = await db.query(sql, [
        req.body.content,
        req.body.postId,
        req.body.userId,
      ]);
      output.notification = await addNotification(
        req.body.userId,
        req.body.content,
        req.body.postId,
        result.insertId
      );
      output.success = true;
    }

    if (req.file) {
      // 目前留言還沒有要上傳圖片
      const newFilePath = req.file.path.slice(21);
      // "http://localhost:3001/community/" + req.file.path.slice(21);
      console.log("newFilePath", newFilePath);
      // http://localhost:3005/johnny/3a5a7ce6-ca08-4484-9de8-6c22d7448540.jpg 圖片顯示位置
      req.body.image_url = newFilePath; // 圖片的路徑保存在 newFilePath 中
      const sql =
        "INSERT INTO `sn_comments` ( `content`, `image_url`, `post_id`, `user_id`) VALUES ( ?, ?, ?, ?)";
      [result] = await db.query(sql, [
        req.body.content,
        req.body.image_url,
        req.body.postId,
        req.body.user_id,
      ]);
      output.notification = await addNotification(
        req.body.userId,
        req.body.content,
        req.body.postId,
        result.insertId
      );

      output.success = true;
    }
    // console.log("reqBody:", req.body);
    output.success = !!result.affectedRows;
  } catch (err) {
    console.log(err);
  }
  console.log(output);
  res.json(output);
});

router.delete("/cmremove/:commentId", async (req, res) => {
  let commentId = +req.params.commentId || 0;
  // console.log(post_id);
  let output = {
    success: false,
    bodyData: req.body || "no body data",
    errors: {},
    commentId,
  };

  let result = {};
  try {
    if (commentId >= 1) {
      const sql = "DELETE FROM `sn_comments` WHERE comment_id=?";
      [result] = await db.query(sql, [commentId]);
      output.success = !!result.affectedRows;
    }
  } catch (err) {
    console.log(err);
  }
  res.json(output);
});

router.put(
  "/cmedit/:commentId?",
  uploadImgs.single("photo"),
  async (req, res) => {
    const output = {
      success: false,
      bodyData: { body: req.body, file: req.file },
      errors: {},
    };
    // console.log("the bodyData: ", output.bodyData);

    let commentId = +req.params.commentId || 0;
    console.log(commentId);

    if (!commentId) {
      res.json("沒有 commentId");
      return;
    }

    let result = {};
    try {
      // console.log("this is photo:", req.file);

      if (!req.file) {
        const sql = `UPDATE sn_comments SET content=? WHERE comment_id=${commentId}`;
        [result] = await db.query(sql, [req.body.content]);
      }
      if (req.file) {
        // console.log("來到圖片區但是沒有圖片");
        // 留言圖片先不做
        const newFilePath = req.file.path.slice(21);
        // "http://localhost:3001/community/" + req.file.path.slice(21);
        console.log("newFilePath", newFilePath);
        // http://localhost:3005/johnny/3a5a7ce6-ca08-4484-9de8-6c22d7448540.jpg 圖片顯示位置
        req.body.image_url = newFilePath; // 圖片的路徑保存在 newFilePath 中
        const sql = `UPDATE sn_comments SET content=?, image_url=? WHERE comment_id=${commentId}`;
        [result] = await db.query(sql, [req.body.content, req.body.image_url]);
      }

      // console.log("reqBody:", req.body);
      output.success = !!result.affectedRows;
    } catch (err) {
      console.log(err);
    }
    console.log(output);
    res.json(output);
  }
);

router.get("/updateviewcount/:postId?", async (req, res) => {
  let postId = +req.params.postId;
  console.log(postId);
  const output = {
    success: false,
    message: "",
    errors: {},
  };

  try {
    // 更新觀看次數
    if (postId) {
      const sql =
        "UPDATE sn_posts SET view_count = view_count + 1 WHERE post_id =?";
      const [counter] = await db.query(sql, [postId]);
      console.log(counter);
      if (!!counter.affectedRows) {
        output.message = "觀看次數已更新";
      } else {
        output.errors = "沒有該篇postId文章";
      }
    } else {
      output.message = "沒有postId";
    }
  } catch (err) {
    console.error("更新觀看次數時出錯：", err);
    output.message = "更新觀看次數時出錯";
  }
  res.json(output);
});

export default router;
