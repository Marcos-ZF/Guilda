/* eslint-disable @next/next/no-img-element */
"use client";

import { ChangeEvent, PointerEvent, useRef, useState } from "react";
import styles from "./image-crop-input.module.css";

type Props = {
  name: string;
  label: string;
  aspect?: number;
  outputWidth?: number;
  quality?: number;
};

export default function ImageCropInput({
  name,
  label,
  aspect = 1,
  outputWidth = 1000,
  quality = .9,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [baseSize, setBaseSize] = useState({ width: 0, height: 0 });
  const dragRef = useRef({ pointerId: 0, startX: 0, startY: 0, originX: 0, originY: 0 });

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setZoom(1); setX(0); setY(0);
    const reader = new FileReader();
    reader.onload = () => setSource(String(reader.result));
    reader.readAsDataURL(file);
  }

  function cancel() {
    setSource(null); setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: x, originY: y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = dragRef.current.originX + event.clientX - dragRef.current.startX;
    const nextY = dragRef.current.originY + event.clientY - dragRef.current.startY;
    const maxX = Math.max(0, (baseSize.width * zoom - rect.width) / 2);
    const maxY = Math.max(0, (baseSize.height * zoom - rect.height) / 2);
    setX(Math.max(-maxX, Math.min(maxX, nextX)));
    setY(Math.max(-maxY, Math.min(maxY, nextY)));
  }

  function imageLoaded() {
    const image = imageRef.current, crop = cropRef.current;
    if (!image || !crop) return;
    const rect = crop.getBoundingClientRect();
    const base = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    setBaseSize({ width: image.naturalWidth * base, height: image.naturalHeight * base });
  }

  async function apply() {
    const image = imageRef.current;
    if (!image || !inputRef.current) return;
    const width = outputWidth, height = Math.round(width / aspect);
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); if (!context) return;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const base = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const scale = base * zoom, drawWidth = image.naturalWidth * scale, drawHeight = image.naturalHeight * scale;
    const previewWidth = cropRef.current?.getBoundingClientRect().width || width;
    const ratio = width / previewWidth;
    context.drawImage(image, (width - drawWidth) / 2 + x * ratio, (height - drawHeight) / 2 + y * ratio, drawWidth, drawHeight);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob) return;
    const transfer = new DataTransfer(); transfer.items.add(new File([blob], `${fileName.replace(/\.[^.]+$/, "") || "imagem"}.webp`, { type: "image/webp" }));
    inputRef.current.files = transfer.files; setSource(null);
  }

  return <div className={styles.wrapper}>
    <label>{label}</label>
    <input ref={inputRef} className={styles.input} name={name} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={choose}/>
    {fileName && !source && <small className={styles.ready}>Imagem ajustada: {fileName}</small>}
    {source && <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Ajustar imagem">
      <div className={styles.modal}><div className={styles.modalHeader}><strong>Ajustar imagem</strong><button type="button" onClick={cancel}>×</button></div>
      <p className={styles.help}>Arraste a imagem dentro do retângulo para definir exatamente o enquadramento.</p>
      <div ref={cropRef} className={styles.crop} style={{aspectRatio:String(aspect)}} onPointerDown={startDrag} onPointerMove={drag}><img ref={imageRef} onLoad={imageLoaded} draggable="false" src={source} alt="Prévia do ajuste" style={{width:baseSize.width*zoom||"auto",height:baseSize.height*zoom||"auto",transform:`translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`}}/><span>ÁREA VISÍVEL</span></div>
      <label>Zoom</label><input type="range" min="1" max="3" step=".05" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/>
      <div className={styles.actions}><button type="button" onClick={cancel}>Cancelar</button><button type="button" onClick={apply}>Aplicar</button></div></div>
    </div>}
  </div>;
}
