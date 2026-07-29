"use client";

import dynamic from "next/dynamic";

export const MuiCircularProgress = dynamic(
  () => import("@mui/material/CircularProgress"),
  { ssr: false },
);

export const MuiPagination = dynamic(
  () => import("@mui/material/Pagination"),
  { ssr: false },
);
