import Miko from './Miko';

export default function Loading({ text }: { text: string }) {
  return (
    <div className="loading" role="status">
      <Miko size={96} mood="think" />
      <p className="display" style={{ fontSize: '1.3rem' }}><span className="dots">{text}</span></p>
    </div>
  );
}
