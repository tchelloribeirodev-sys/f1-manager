type Props = { size?: number };

/**
 * Emblema do app — usa o logo em public/logo.png (mesma imagem do favicon
 * da aba do navegador), exibido na tela de login e na barra lateral.
 */
export default function BrandMark({ size = 34 }: Props) {
  return (
    <img
      src="/logo.png"
      alt="Grid Manager"
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}
