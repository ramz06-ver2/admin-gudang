import dayjs from "dayjs";
import "dayjs/locale/id";

dayjs.locale("id");

export const formatRupiah = (value: number | null | undefined): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value ?? 0);

export const formatNumber = (value: number | null | undefined): string =>
  new Intl.NumberFormat("id-ID").format(value ?? 0);

export const formatDate = (date: string | Date): string =>
  dayjs(date).format("DD MMM YYYY");

export const formatFullDate = (date: string | Date): string =>
  dayjs(date).format("dddd, DD MMMM YYYY");

export const formatShortDate = (date: string | Date): string =>
  dayjs(date).format("DD/MM");