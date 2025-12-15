import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

// A4 尺寸像素 (96 DPI)
const A4_WIDTH_PX = 794; 

/**
 * 将 Word (.docx) 文件转换为高清图片 Blob
 */
export const convertDocxToImage = async (file: File): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // 1. 将 docx 转换为 HTML
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  // 2. 创建渲染容器
  const container = document.createElement('div');
  container.className = 'office-preview-content';
  container.innerHTML = html;
  
  // 注入到隐藏区域进行渲染
  const stage = document.getElementById('conversion-stage');
  if (stage) {
    stage.innerHTML = '';
    stage.appendChild(container);
  }

  // 3. 使用 html2canvas 截图
  // scale: 2 保证高清 (Retina 级别)，接近矢量观感
  const canvas = await html2canvas(container, {
    scale: 2.5, 
    useCORS: true,
    backgroundColor: '#ffffff'
  });

  // 4. 清理
  if (stage) stage.innerHTML = '';

  // 5. 转为 Uint8Array
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
      } else {
        reject(new Error('Canvas conversion failed'));
      }
    }, 'image/png');
  });
};

/**
 * 将 Excel (.xlsx) 文件转换为高清图片 Blob
 */
export const convertXlsxToImage = async (file: File): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // 1. 解析 Excel
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // 2. 转为 HTML Table
  const html = XLSX.utils.sheet_to_html(worksheet);

  // 3. 创建渲染容器并注入必要的 CSS
  // XLSX 生成的 HTML 没有样式，默认是透明的，截图后是白的。必须添加边框和背景。
  const container = document.createElement('div');
  container.className = 'office-preview-content';
  container.style.width = 'auto'; 
  container.style.minWidth = '794px';
  container.style.backgroundColor = '#ffffff'; // 强制白底
  
  const excelStyle = `
    <style>
      table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
      td, th { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 14px; color: #1f2937; }
      tr:nth-child(even) { background-color: #f9fafb; }
      tr:hover { background-color: #f3f4f6; }
    </style>
  `;

  container.innerHTML = `
    ${excelStyle}
    <div style="padding: 20px;">
        <h2 style="margin-bottom: 20px; font-size: 18px; color: #111827; font-weight: bold;">${file.name}</h2>
        ${html}
    </div>
  `;

  const stage = document.getElementById('conversion-stage');
  if (stage) {
    stage.innerHTML = '';
    stage.appendChild(container);
  }

  // 4. 截图
  const canvas = await html2canvas(container, {
    scale: 2.5,
    backgroundColor: '#ffffff',
    logging: false
  });

  if (stage) stage.innerHTML = '';

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
      } else {
        reject(new Error('Canvas conversion failed'));
      }
    }, 'image/png');
  });
};