"use strict";
var Acrobat = Application("Adobe Acrobat Pro");
var doc = Acrobat.pdfWindows; // ドキュメントを取得する
doc[0].zoomFactor = 50; // 表示倍率を50%に設定する
//# sourceMappingURL=sample.js.map