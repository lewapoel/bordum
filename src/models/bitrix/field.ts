export type BaseFieldMeta = {
  type: string;
  title: string;
  formLabel: string;
};

export type EnumFieldItem = {
  ID: string;
  VALUE: string;
};

export type EnumFieldMeta = BaseFieldMeta & {
  items: Array<EnumFieldItem>;
};

export type FieldMeta = BaseFieldMeta | EnumFieldMeta;
export type FieldsMeta = { [key: string]: FieldMeta };
