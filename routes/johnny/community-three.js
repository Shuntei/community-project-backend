import express from "express";
import cors from "cors";
import db from "../../utils/mysql2-connect.js";
import uploadImgs from "../../utils/johnny/upload-imgs.js";
import bodyParser from "body-parser";

// 這個檔案用於好友 通知相關 及獲取會員資料

const router = express.Router();

router.use(cors());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// 靜態文件存放目錄
router.use(express.static("routes/johnny/upload"));

router.get("/userinfoByPostId", async (req, res) => {
  const postId = +req.query.postId;

  const userInfoSql = `
  SELECT mb_user.* 
  FROM sn_posts
  JOIN mb_user ON sn_posts.user_id = mb_user.id
  WHERE sn_posts.post_id=?
`;
  const [userInfo] = await db.query(userInfoSql, [postId]);

  res.json(userInfo);
});

router.get("/userinfo", async (req, res) => {
  // const sql = `SELECT * FROM mb_user WHERE 1`;
  const keyword = req.query.followsKeyword;

  console.log("keyword", keyword);

  let where = ` WHERE 1 `;
  if (keyword) {
    const keywordEsc = db.escape("%" + keyword + "%");
    where += ` AND username LIKE ${keywordEsc} `;
  }

  const userInfoSql =
    // `SELECT mb_user.*, sn_friends.* FROM mb_user LEFT JOIN sn_friends ON mb_user.id = sn_friends.friend_id ${where} ORDER BY id DESC `;
    `SELECT mb_user.* FROM mb_user ${where} ORDER BY id DESC `;
  const [userInfo] = await db.query(userInfoSql);
  // console.log(userInfo);

  res.json(userInfo);
});

router.get("/showfollows", async (req, res) => {
  let psUserId = +req.query.psUserId;
  const keyword = req.query.followsKeyword;
  console.log("showfollowsKeyword:", keyword);
  let AND = ``;
  if (!psUserId) {
    console.log("no psUserId");
    return;
  }
  if (keyword) {
    const keywordEsc = db.escape("%" + keyword + "%");
    AND += ` AND username LIKE ${keywordEsc} `;
  }
  // 妳追蹤的
  const relation = `SELECT mb_user.*
                    FROM mb_user
                    LEFT JOIN sn_friends ON mb_user.id = sn_friends.friend_id
                    WHERE sn_friends.user_id = ${psUserId} ${AND} ;`;
  const [result] = await db.query(relation);

  // 追蹤你的
  const relation2 = `SELECT mb_user.*, sn_friends.*
                    FROM mb_user
                    LEFT JOIN sn_friends ON mb_user.id = sn_friends.user_id
                    WHERE sn_friends.friend_id = ${psUserId} ${AND} ;`;
  const [result2] = await db.query(relation2);
  // console.log(result);
  // console.log(result2);

  res.json({ follows: result, followers: result2 });
});

router.get("/followedstatus", async (req, res) => {
  let authId = +req.query.authId;
  let psUserId = +req.query.psUserId;
  let status = req.query.status;

  console.log(authId, psUserId, status);
  if (!authId || !psUserId || !status) {
    res.json({ result: "failed to get query" });
    return;
  }

  const checkoutIsFollowed = `SELECT COUNT(1) FROM sn_friends WHERE user_id=${authId} AND friend_id=${psUserId}`;
  const [[follwedResult]] = await db.query(checkoutIsFollowed);
  const isFollowed = follwedResult["COUNT(1)"];

  // 接收到使雙方id、追蹤指令、且非追蹤狀態
  if (authId && psUserId && status === "follow" && isFollowed === 0) {
    // console.log("isFollowed", isFollowed);
    const follow = `INSERT INTO sn_friends (user_id, friend_id, status)
    VALUES (?, ?, ?)`;
    const [followedStatus] = await db.query(follow, [authId, psUserId, status]);
    // console.log("fl", followedStatus);
    if (followedStatus.affectedRows) {
      res.json({ result: "added", detail: followedStatus });
      return;
    }
  }
  if (authId && psUserId && status === "unfollow" && isFollowed > 0) {
    const unfollow = `DELETE FROM sn_friends WHERE user_id = ? AND friend_id = ?`;
    const [followedStatus] = await db.query(unfollow, [authId, psUserId]);
    // console.log("ufl:", followedStatus);
    if (followedStatus.affectedRows) {
      res.json({ result: "deleted", detail: followedStatus });
    }
    return;
  } else {
    res.json({ result: "nothing to delete" });
    return;
  }
});

export default router;
