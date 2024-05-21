"# ruins-exploring"  

這是與小組合作的專案  
我負責community(社群)的部分  
資料夾或檔案位置: 

前端(存放在另一個repository)   
ruins-next/components/johnny  
ruins-next/contexts/use-boards.js  
ruins-next/contexts/use-toggles.js  
ruins-next/pages/community  

後端 
ruins-node/routes/johnny  
ruins-node/utils/johnny/upload-imgs.js  

1.下載檔案後分別進入ruins-next和ruins-node檔案位置並執行npm i  
2.在ruins-node執行npm run dev,在ruins-next執行npm run build後,執行npm start  
3.輸入網址: http://localhost:3000/community/main-page 進入頁面    
(或是參考佈署vercel的網頁: community-project-frontend.vercel.app)  

進入頁面後  
主要有community(公共論壇)、personal(個人頁面)兩部分，有RWD設計、使用線上資料庫  
右上角的LOG IN,登入後可以執行需要權限的操作  
(如personal頁面新增修改文章、上傳圖片、留言、按讚、新增移除好友等)。  
※如不小心按到其他頁面，點左上選單圖示，選community可回到社群頁面  

登入方式可以選擇:  
1.google帳號登入  
2.另外註冊帳號  
3.使用我的帳號:johnny,密碼:283au4a83  
