export type FieldMeta = {
  type: string;
  title: string;
};

export type FieldsMeta = { [key: string]: FieldMeta };

export type EnumFieldItem = {
  ID: string;
  VALUE: string;
};

export type EnumFieldMeta = FieldMeta & {
  items: Array<EnumFieldItem>;
};
