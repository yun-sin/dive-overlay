import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import "./index.css";

export default function DiveOverlayUploader() {
  const [file, setFile] = useState(null);
  const [imageURL, setImageURL] = useState(null);
  const [loading, setLoading] = useState(false);
  const [diveSite, setDiveSite] = useState("");
  const [isTechnical, setIsTechnical] = useState(false);
  const [alignment, setAlignment] = useState("left");
  const [lineWidth, setLineWidth] = useState(10);
  const [fontColor, setFontColor] = useState("White");
  const [fontSize, setFontSize] = useState(60);
  const [showDate, setShowDate] = useState(true);
  const [includeBackground, setIncludeBackground] = useState(true);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [lang, setLang] = useState("en");
  const [showGraph, setShowGraph] = useState(true);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setImageURL(null);
    setShowInstructions(false);
  };

  // ✅ 이미지 복사 함수
  async function copyImageToClipboard(dataUrl) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      alert("이미지가 클립보드에 복사되었습니다");
    } catch (err) {
      console.error("이미지 복사 실패:", err);
      alert("이미지 복사에 실패했습니다");
    }
  }

  useEffect(() => {
    if (!file) return;
    setLoading(true);

    Papa.parse(file, {
      complete: (results) => {
        try {
          const raw = results.data;
          const headersRow = raw.find(row => row.includes("Time (sec)"));
          const headers = headersRow.map(h => h.trim().toLowerCase());
          const headerIndex = raw.indexOf(headersRow);
          const dataRows = raw.slice(headerIndex + 1).filter(row => row.length > 1);
          const getIndex = (key) => headers.findIndex(h => h === key.toLowerCase());
          const parseNum = (s) => parseFloat((s || '').toString().replace(',', '.'));

          const timeIndex = getIndex("time (sec)");
          const depthIndex = getIndex("depth");
          const firstStopIndex = getIndex("first stop depth");
          const o2Index = getIndex("fraction o2");
          const heIndex = getIndex("fraction he");

          const time = dataRows.map(r => parseNum(r[timeIndex]) / 60).filter(n => !isNaN(n));
          const depth = dataRows.map(r => parseNum(r[depthIndex])).filter(n => !isNaN(n));
          const firstStopDepth = dataRows.map(r => parseNum(r[firstStopIndex])).filter(n => !isNaN(n));

          const maxDepth = depth.length ? Math.max(...depth) : 0;
          const totalTime = time.length ? Math.max(...time) : 0;

          let date = "N/A";
          let timeString = "";
          for (let rowIdx = 0; rowIdx < headerIndex; rowIdx++) {
            for (let colIdx = 0; colIdx < raw[rowIdx].length; colIdx++) {
              const cell = raw[rowIdx][colIdx]?.toString().trim().toLowerCase();
              if (cell === "start date" && raw[rowIdx + 1]?.[colIdx]) {
                const value = raw[rowIdx + 1][colIdx]?.toString().trim();
                const parsed = new Date(value);
                if (!isNaN(parsed)) {
                  const formattedDate = `${parsed.getFullYear()}-${(parsed.getMonth() + 1).toString().padStart(2, '0')}-${parsed.getDate().toString().padStart(2, '0')}`;
                  let hours = parsed.getHours();
                  const minutes = parsed.getMinutes().toString().padStart(2, '0');
                  const ampm = hours >= 12 ? 'PM' : 'AM';
                  hours = hours % 12;
                  hours = hours === 0 ? 12 : hours;
                  const formattedTime = `${hours}:${minutes}${ampm}`;
                  date = formattedDate;
                  timeString = formattedTime;
                }
                break;
              }
            }
            if (date !== "N/A") break;
          }

          const tempIndex = getIndex("water temp");
          const temps = dataRows.map(r => parseNum(r[tempIndex])).filter(n => !isNaN(n));
          const minTemp = temps.length ? Math.min(...temps).toFixed(1) : "N/A";
          const maxTemp = temps.length ? Math.max(...temps).toFixed(1) : "N/A";
          const tempRange = (minTemp !== "N/A" && maxTemp !== "N/A") ? `${minTemp} – ${maxTemp} °C` : "N/A";

          let gfValue = null;
          if (isTechnical) {
            for (let rowIdx = 0; rowIdx < headerIndex; rowIdx++) {
              for (let colIdx = 0; colIdx < raw[rowIdx].length; colIdx++) {
                const cell = raw[rowIdx][colIdx]?.toString().trim().toLowerCase();
                if (cell === "vpm-b conservatism") {
                  const below = raw[rowIdx + 1]?.[colIdx]?.toString().trim();
                  if (/^\d{1,3}\/\d{1,3}$/.test(below)) {
                    gfValue = below;
                  }
                  break;
                }
              }
              if (gfValue) break;
            }
          }

          let gasUsed = "N/A";
          if (isTechnical && o2Index !== -1) {
            const mixSet = new Set();
            dataRows.forEach(r => {
              const o2 = parseNum(r[o2Index]);
              const he = heIndex !== -1 ? parseNum(r[heIndex]) : 0;
              if (isNaN(o2)) return;
              const o2Pct = Math.round(o2 * 100);
              const hePct = isNaN(he) ? 0 : Math.round(he * 100);
              if (hePct > 0) mixSet.add(`Tx${o2Pct}/${hePct}`);
              else if (o2Pct === 21) mixSet.add("Air");
              else mixSet.add(`EAN${o2Pct}`);
            });
            gasUsed = [...mixSet].join(", ");
          }

          const canvas = document.createElement("canvas");
          canvas.width = 1080;
          canvas.height = 1920;
          const ctx = canvas.getContext("2d");

          const drawOverlay = () => {
            ctx.fillStyle = fontColor;
            ctx.textBaseline = "middle";
            const yHeader = 140;

            if (diveSite) {
              ctx.textAlign = "left";
              ctx.font = `bold ${fontSize}px sans-serif`;
              ctx.fillText(diveSite, 80, yHeader);
            }

            if (showDate) {
              ctx.textAlign = "right";
              ctx.font = "bold 40px sans-serif";
              ctx.fillText(date, canvas.width - 80, yHeader - 22);
              ctx.fillText(timeString, canvas.width - 80, yHeader + 22);
            }

            let y = yHeader + 200;
            const drawText = (label, value) => {
              ctx.fillStyle = fontColor;
              ctx.textAlign = alignment;
              const xAlign = alignment === "left" ? 80 : alignment === "right" ? canvas.width - 80 : canvas.width / 2;

              ctx.font = `bold ${fontSize * 0.5}px sans-serif`;
              ctx.fillText(label, xAlign, y);
              y += 60;

              let displayFontSize = fontSize;
              if (label === (lang === "kr" ? "기체" : "Gas")) {
                ctx.font = `bold ${fontSize}px sans-serif`;
                const maxWidth = canvas.width - 160;
                const textWidth = ctx.measureText(value).width;
                if (textWidth > maxWidth) {
                  displayFontSize = Math.floor(fontSize * 0.7);
                }
              }

              ctx.font = `bold ${displayFontSize}px sans-serif`;
              ctx.fillText(value, xAlign, y);
              y += 100;
            };

            drawText(lang === "kr" ? "최대 수심" : "Max Depth", `${maxDepth.toFixed(1)} m`);
            drawText(lang === "kr" ? "다이빙 타임" : "Total Time", `${totalTime.toFixed(1)} min`);
            drawText(lang === "kr" ? "수온" : "Water Temp", tempRange);
            if (isTechnical) {
              drawText("GF", gfValue || "N/A");
              drawText(lang === "kr" ? "기체" : "Gas", gasUsed);
            }

            if (showGraph && time.length && depth.length && totalTime && maxDepth) {
              const gx = 100, gy = 1350, gw = 880, gh = 300;
              ctx.strokeStyle = "#00AEEF";
              ctx.lineWidth = lineWidth;
              ctx.beginPath();
              for (let i = 0; i < time.length; i++) {
                const x = gx + (time[i] / totalTime) * gw;
                const yDepth = gy + (depth[i] / maxDepth) * gh;
                if (i === 0) ctx.moveTo(x, yDepth);
                else ctx.lineTo(x, yDepth);
              }
              ctx.stroke();

              const hasStop = firstStopDepth.some(d => d > 0.1);
              if (hasStop) {
                ctx.strokeStyle = "red";
                ctx.lineWidth = 7;
                ctx.beginPath();
                for (let i = 0; i < time.length && i < firstStopDepth.length; i++) {
                  if (firstStopDepth[i] <= 0) continue;
                  const x = gx + (time[i] / totalTime) * gw;
                  const yCeiling = gy + (firstStopDepth[i] / maxDepth) * gh;
                  if (i === 0 || firstStopDepth[i - 1] <= 0) ctx.moveTo(x, yCeiling);
                  else ctx.lineTo(x, yCeiling);
                }
                ctx.stroke();
              }
            }

            setImageURL(canvas.toDataURL("image/png"));
          };

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (includeBackground && backgroundImage) {
            const bg = new Image();
            bg.onload = () => {
              ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
              drawOverlay();
            };
            bg.src = backgroundImage;
          } else {
            drawOverlay();
          }

        } catch (err) {
          console.error(err);
          alert("Parsing failed.");
        } finally {
          setLoading(false);
        }
      }
    });
  }, [file, diveSite, showDate, alignment, lineWidth, fontSize, fontColor, isTechnical, includeBackground, backgroundImage, lang, showGraph]);

  async function copyImageToClipboard(dataUrl) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      alert("이미지가 클립보드에 복사되었습니다");
    } catch (err) {
      console.error("이미지 복사 실패:", err);
      alert("이미지 복사에 실패했습니다");
    }
  }

  return (
    <div className="container">
      <h1 className="title">{lang === "kr" ? "다이브 오버레이 생성기" : "Dive Overlay Generator"}</h1>
      <div className="content-wrapper">
        <div className="panel">
          <form className="form">
            <div className="row-group">
              <label htmlFor="logFile" className="file-label" style={{ width: "100%" }}>
                <div className={file ? "custom-file-upload uploaded" : "custom-file-upload"}>
                  {file ? file.name : lang === "kr" ? "다이빙 로그 파일을 업로드 하세요 (.csv 형식)" : "Upload your dive log file (.csv format)"}
                </div>
              </label>
              <input
                id="logFile"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>

            {file && (
              <>
                <div className="row-group">
                  <label className="row-label">{lang === "kr" ? "다이브 포인트" : "Dive Site"}</label>
                  <input type="text" className="input-inline" value={diveSite} onChange={(e) => setDiveSite(e.target.value)} />
                </div>
                <div className="row-group">
                  <label className="row-label">{lang === "kr" ? "날짜 표시" : "Show Date"}</label>
                  <input type="checkbox" checked={showDate} onChange={(e) => setShowDate(e.target.checked)} />
                </div>
                <div className="row-group">
                  <label className="row-label">{lang === "kr" ? "그래프 표시" : "Show Graph"}</label>
                  <input type="checkbox" checked={showGraph} onChange={(e) => setShowGraph(e.target.checked)} />
                </div>
                <div className="row-group">
                  <label className="row-label">{lang === "kr" ? "모드" : "Mode"}</label>
                  <label><input type="radio" checked={!isTechnical} onChange={() => setIsTechnical(false)} /> Rec</label>
                  <label><input type="radio" checked={isTechnical} onChange={() => setIsTechnical(true)} /> Tec</label>
                </div>
                <div className="row-group">
                  <label className="row-label">{lang === "kr" ? "정렬" : "Align"}</label>
                  <label><input type="radio" name="align" value="left" checked={alignment === "left"} onChange={() => setAlignment("left")} /> {lang === "kr" ? "왼쪽" : "Left"}</label>
                  <label><input type="radio" name="align" value="center" checked={alignment === "center"} onChange={() => setAlignment("center")} /> {lang === "kr" ? "중앙" : "Center"}</label>
                  <label><input type="radio" name="align" value="right" checked={alignment === "right"} onChange={() => setAlignment("right")} /> {lang === "kr" ? "오른쪽" : "Right"}</label>
                </div>
                <div className="row-group">
                  <label className="row-label">{lang === "kr" ? "선 두께" : "Line Width"}</label>
                  <input type="number" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value))} className="input-inline" />
                </div>
                <div className="row-group">
                  <label className="row-label">{lang === "kr" ? "폰트 크기" : "Font Size"}</label>
                  <input type="number" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="input-inline" />
                </div>
                <div className="row-group">
                  <label className="row-label">{lang === "kr" ? "폰트 컬러" : "Font Color"}</label>
                  <input type="color" value={fontColor} onChange={(e) => setFontColor(e.target.value)} />
                </div>
                <div className="row-group">
                  <label className="row-label">{lang === "kr" ? "배경 이미지" : "BG Image"}</label>
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => setBackgroundImage(reader.result);
                      reader.readAsDataURL(file);
                    }
                  }} className="input-inline" />
                </div>
                {backgroundImage && (
                  <div className="row-group">
                    <label className="row-label">{lang === "kr" ? "배경 포함" : "Include BG"}</label>
                    <input type="checkbox" checked={includeBackground} onChange={(e) => setIncludeBackground(e.target.checked)} />
                  </div>
                )}
              </>
            )}
          </form>

          <hr className="divider" />

          <div className="row-group">
            <label className="row-label">{lang === "kr" ? "Language" : "Language"}</label>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="input-inline">
              <option value="kr">한국어</option>
              <option value="en">English</option>
            </select>
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowInstructions(!showInstructions);
              }}
              className="generate-button"
              style={showInstructions ? { backgroundColor: "#444" } : {}}
            >
              {showInstructions ? (lang === "kr" ? "설명 숨기기" : "Hide Instructions") : (lang === "kr" ? "사용 설명 보기" : "Show Instructions")}
            </button>
          </div>

          {showInstructions && (
            <div className="instructions">
              <h2>{lang === "kr" ? "사용 방법" : "Instructions"}</h2>
              <ul>
                <li>{lang === "kr" ? "로그 파일에 .csv 형식의 파일을 업로드 하세요." : "Please upload a .csv log file."}</li>
                <li>{lang === "kr" ? "[이미지 다운로드] 버튼을 클릭하여 결과 이미지를 저장하세요." : "Click [Download Image] to save the final result."}</li>
                <br />
                <li>{lang === "kr" ? "현재 Shearwater 로그 파일만 이미지 생성이 가능합니다." : "Currently, only Shearwater log files are supported for image generation."}</li>
                <li>
                  {lang === "kr" ? (
                    <>.csv 파일은 데스크탑에서 <a href="https://shearwater.com/ko/pages/shearwater-cloud" target="_blank" rel="noopener noreferrer">Shearwater Cloud</a> 에서 다운로드하세요.</>
                  ) : (
                    <>You can get a .csv file from <a href="https://shearwater.com/pages/shearwater-cloud" target="_blank" rel="noopener noreferrer">Shearwater Cloud</a>.</>
                  )}
                </li>
                <li>{lang === "kr" ? "정렬, 폰트, 선 두께를 자유롭게 설정할 수 있습니다." : "You can customize alignment, font size, and line width freely."}</li>
                <li>{lang === "kr" ? "Rec 또는 Tec 모드에 따라 표시되는 정보가 달라집니다." : "Displayed data depends on selected mode: Rec or Tec."}</li>
                <li>{lang === "kr" ? "배경 이미지를 선택하고 배경 포함 여부를 설정할 수 있습니다." : "You can select a background and choose whether to include it."}</li>
              </ul>
            </div>
          )}

          {showInstructions && (
            <div style={{ marginTop: "3rem", textAlign: "right" }}>
                <a
                  href="https://www.instagram.com/akoyunsin/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#00aaff", textDecoration: "underline" }}
                >
                  @akoyunsin
                </a>
            </div>
          )}
        </div>

        {imageURL && (
          <div className="result">
            <h2 className="subtitle">{lang === "kr" ? "생성된 이미지" : "Generated Image"}</h2>
            <img src={imageURL} alt="Dive Summary" className="result-image" />

            <div className="share-buttons-horizontal" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1.5rem', gap: '2rem' }}>
              {[{
                icon: '⬇️',
                label: lang === 'kr' ? '저장' : 'Save',
                onClick: null,
                href: imageURL,
                download: true
              }, {
                icon: '🖼️',
                label: lang === 'kr' ? '이미지 복사' : 'Copy',
                onClick: () => copyImageToClipboard(imageURL)
              }].map((btn, idx) => (
                <div key={idx} style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
                  onClick={btn.onClick}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginBottom: '0.4rem'
                  }}>
                    {btn.icon}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'white' }}>{btn.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
