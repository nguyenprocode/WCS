const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Trạng thái server chỉ dùng để hiển thị kết nối; mã nguồn người dùng
// được lưu ở localStorage của trình duyệt, không lưu trên server.
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        message: "Web Code Studio Server đang hoạt động!",
        runtime: "Node.js",
        port: PORT,
        storage: "browser-localStorage"
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log("--------------------------------");
    console.log("   WEB CODE STUDIO");
    console.log("--------------------------------");
    console.log(`Server: http://localhost:${PORT}`);
    console.log("Storage: browser localStorage");
    console.log("Status: Running");
    console.log("--------------------------------");
});
