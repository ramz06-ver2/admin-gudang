import { formatRupiah } from "../../utility/format";

interface Props {
  value: number | null | undefined;
  bold?: boolean;
}

export const RupiahText = ({ value, bold }: Props) => (
  <span style={{ fontWeight: bold ? 600 : 400 }}>{formatRupiah(value)}</span>
);