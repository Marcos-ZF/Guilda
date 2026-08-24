"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./LiveNameSearch.module.css";

type LiveNameSearchProps = {
  path: string;
  initialValue?: string;
  label: string;
};

export default function LiveNameSearch({ path, initialValue = "", label }: LiveNameSearchProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const search = value.trim();
    if (search === initialValue.trim()) return;

    const timer = window.setTimeout(() => {
      const destination = search ? `${path}?busca=${encodeURIComponent(search)}` : path;
      router.replace(destination, { scroll: false });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [initialValue, path, router, value]);

  return (
    <div className={styles.search} role="search">
      <label className={styles.label} htmlFor={`name-search-${path.replaceAll("/", "-")}`}>
        {label}
      </label>
      <div className={styles.field}>
        <span aria-hidden="true">⌕</span>
        <input
          id={`name-search-${path.replaceAll("/", "-")}`}
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Digite um nome..."
          autoComplete="off"
        />
      </div>
    </div>
  );
}
