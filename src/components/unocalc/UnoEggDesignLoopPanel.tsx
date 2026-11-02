import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import {
  canMarkDesignReady, canSendDesign, hasMarketingReturn, latestDesignSubmission,
  markDesignReady, returnDesignFeedback, sendDesign, type DesignLoop, type DesignDestination,
  type ReviewEvidence,
} from "@/lib/unocalcEggDesignLoop";
import { listEggDesignAssets, putEggDesignAsset, type EggDesignAsset } from "@/lib/unocalcEggDesignAssets";

type Locale = "ru" | "uk" | "en";
type Node = "design" | "marketing" | "testDrive";
type Props = {
  locale: Locale;
  node: Node;
  loop: DesignLoop;
  setLoop: Dispatch<SetStateAction<DesignLoop | null>>;
  originalMarketing: string;
  onNavigate: (node: Node) => void;
};

const copy = {
  ru: {
    eyebrow: "ЯЙЦО / ФОРМИРОВАНИЕ ОБЪЕКТА / РУЧНОЙ ПРОТОТИП",
    scope: "Это ручная проверка процесса. Маркетинг не исследует рынок автоматически, а Тест-драйв не проводит физических испытаний по эскизам.",
    design: "Дизайн", marketing: "Маркетинг", testDrive: "Тест-драйв",
    source: "Полученная концепция · слой 1", initialMarket: "Вывод первого цикла Маркетинга",
    work: "Проектная версия", desc: "Описание формы, пропорций и замысла",
    descHint: "Опишите первый вариант или изменения после обратной связи. Прикреплённые эскизы сохраняются с версией.",
    descPlaceholder: "Эскизная идея, посадка, пропорции, характер формы…",
    changes: "Что изменилось относительно предыдущего варианта?",
    changesPlaceholder: "Необязательно · кратко обозначьте изменения",
    files: "Добавить эскизы / изображения", filesNote: "Изображения хранятся только в этом браузере. До 4 изображений на отправляемый вариант; один файл — до 8 МБ.",
    storageError: "Не удалось сохранить изображение в этом браузере.",
    wrongFile: "Поддерживаются изображения размером не более 8 МБ.",
    imageLimit: "Для одного варианта допускается не более 4 изображений, всего — до 24.",
    imageRemove: "Убрать из текущего варианта", missingImage: "Изображение недоступно в этом браузере.",
    sendMarket: "На сверку в Маркетинг", sendTest: "На первичный Тест-драйв",
    needsMarket: "Сначала требуется хотя бы одна обратная связь Маркетинга.",
    ready: "Отметить эскизный цикл завершённым",
    readyNote: "Это не подтверждает эргономику или безопасность. Закрывается только текущий цикл ручной концептуальной проверки.",
    readyDone: "Эскизный цикл завершён · версия остаётся доступна в истории.",
    reopen: "Возобновить проработку",
    waitingMarketing: "Версия направлена Маркетингу. Здесь ожидается его ответ.",
    waitingTest: "Версия направлена Тест-драйву. Здесь ожидается его ответ.",
    waitingDesign: "Замечания переданы Дизайну. Следующий вариант формируется там.",
    received: "Полученная версия",
    review: "Замечания к конкретной версии",
    marketPrompt: "Сопоставьте форму с позиционированием и ожидаемой аудиторией. Укажите гипотезы и конкретные расхождения, не меняя проект за Дизайн.",
    testPrompt: "Критически оцените предполагаемый комфорт, устойчивость, посадку, использование и возможные противоречия формы. По эскизу можно сформировать гипотезы, но не подтвердить эксплуатационные свойства.",
    reportPlaceholder: "Внесите аргументированный отзыв к этой версии…",
    evidence: "Статус замечаний", hypothesis: "Гипотеза", observation: "Наблюдение по материалам", question: "Открытый вопрос",
    return: "Вернуть замечания Дизайну",
    returned: "Ответ сохранён и направлен Дизайну.",
    revisions: "История вариантов и замечаний", version: "Версия",
    reviewFrom: "Ответ", noReview: "Отзыв ожидается",
    goDesign: "Открыть Дизайн", goMarketing: "Открыть Маркетинг", goTest: "Открыть Тест-драйв",
    newSketch: "Эскиз", noSketch: "Пока нет прикреплённых эскизов.",
    hintVersion: "Каждая отправка создаёт новую неизменяемую версию, включая выбранные изображения.",
    status: "Текущий фокус",
    result: "Текущая версия рассматривается",
    back: "Возврат к Дизайну",
    onlyManual: "Содержание и критическая проверка вводятся участниками вручную.",
  },
  uk: {
    eyebrow: "ЯЙЦЕ / ФОРМУВАННЯ ОБ'ЄКТА / РУЧНИЙ ПРОТОТИП",
    scope: "Це ручна перевірка процесу. Маркетинг не досліджує ринок автоматично, а Тест-драйв не проводить фізичних випробувань за ескізами.",
    design: "Дизайн", marketing: "Маркетинг", testDrive: "Тест-драйв",
    source: "Отримана концепція · шар 1", initialMarket: "Висновок першого циклу Маркетингу",
    work: "Проєктна версія", desc: "Опис форми, пропорцій і задуму",
    descHint: "Опишіть варіант або зміни після зворотного зв'язку. Ескізи зберігаються разом із версією.",
    descPlaceholder: "Ескізний задум, посадка, пропорції, характер форми…",
    changes: "Що змінилося відносно попереднього варіанту?",
    changesPlaceholder: "Необов'язково · коротко вкажіть зміни",
    files: "Додати ескізи / зображення", filesNote: "Зображення залишаються лише в цьому браузері. До 4 на версію, кожне — до 8 МБ.",
    storageError: "Не вдалося зберегти зображення.", wrongFile: "Потрібне зображення не більш як 8 МБ.",
    imageLimit: "Не більше 4 зображень на версію, усього — до 24.",
    imageRemove: "Прибрати з поточної версії", missingImage: "Зображення недоступне в цьому браузері.",
    sendMarket: "На звірку до Маркетингу", sendTest: "На первинний Тест-драйв",
    needsMarket: "Спочатку потрібен хоча б один відгук Маркетингу.",
    ready: "Позначити ескізний цикл завершеним", readyNote: "Це не підтверджує ергономіку або безпеку, лише поточну ручну перевірку концепції.",
    readyDone: "Ескізний цикл завершено. Версія збережена в історії.", reopen: "Відновити роботу",
    waitingMarketing: "Версію передано Маркетингу, очікується відповідь.",
    waitingTest: "Версію передано Тест-драйву, очікується відповідь.",
    waitingDesign: "Зауваження передано Дизайну. Наступний варіант готується там.",
    received: "Отримана версія", review: "Зауваження до конкретної версії",
    marketPrompt: "Зіставте форму з позиціюванням і аудиторією. Позначайте гіпотези та розбіжності, не змінюючи проєкт замість Дизайну.",
    testPrompt: "Критично оцініть можливий комфорт, стійкість, посадку та суперечності форми. За ескізом не можна підтвердити експлуатаційні властивості.",
    reportPlaceholder: "Введіть обґрунтований відгук до цієї версії…",
    evidence: "Статус зауважень", hypothesis: "Гіпотеза", observation: "Спостереження за матеріалами", question: "Відкрите питання",
    return: "Повернути зауваження Дизайну", returned: "Відповідь збережено і передано Дизайну.",
    revisions: "Історія варіантів і зауважень", version: "Версія", reviewFrom: "Відгук", noReview: "Очікуємо відгук",
    goDesign: "Відкрити Дизайн", goMarketing: "Відкрити Маркетинг", goTest: "Відкрити Тест-драйв",
    newSketch: "Ескіз", noSketch: "Ескізів поки немає.", hintVersion: "Кожне відправлення створює незмінну версію з вибраними зображеннями.",
    status: "Поточний фокус", result: "Версію розглядають", back: "Повернення до Дизайну", onlyManual: "Зміст і критичну перевірку вводять учасники вручну.",
  },
  en: {
    eyebrow: "EGG / OBJECT DEVELOPMENT / MANUAL PROTOTYPE",
    scope: "This manually tests the workflow. Marketing does not research the market automatically, and Test Drive cannot physically validate a sketch.",
    design: "Design", marketing: "Marketing", testDrive: "Test Drive",
    source: "Received concept · layer 1", initialMarket: "First-cycle Marketing conclusion",
    work: "Design version", desc: "Form, proportions and design intention",
    descHint: "Describe your first form or revisions after feedback. Attached sketches are stored with each version.",
    descPlaceholder: "Sketch concept, seating, proportions and character…",
    changes: "What changed since the previous version?", changesPlaceholder: "Optional · describe changes briefly",
    files: "Attach sketches / images", filesNote: "Images are browser-only. Up to 4 per version; up to 8 MB each.",
    storageError: "Could not store this image in your browser.", wrongFile: "Choose an image smaller than 8 MB.",
    imageLimit: "At most 4 images per version and 24 in total.",
    imageRemove: "Remove from current draft", missingImage: "This image isn't available in this browser.",
    sendMarket: "Send to Marketing", sendTest: "Send to initial Test Drive",
    needsMarket: "At least one Marketing response is required first.",
    ready: "Mark sketch cycle complete", readyNote: "This does not certify ergonomics or safety. It only closes this manual conceptual review.",
    readyDone: "Sketch cycle complete. The version remains in history.", reopen: "Reopen development",
    waitingMarketing: "Version sent to Marketing; waiting for its response.",
    waitingTest: "Version sent to Test Drive; waiting for its response.",
    waitingDesign: "Feedback returned to Design. The next version is developed there.",
    received: "Received version", review: "Feedback on this specific version",
    marketPrompt: "Compare the form to intended audience and positioning. Note hypotheses and discrepancies; do not redesign the object.",
    testPrompt: "Critically assess potential comfort, stability, sitting posture and form conflicts. Sketches cannot establish real-world safety or performance.",
    reportPlaceholder: "Write reasoned feedback on this version…",
    evidence: "Evidence level", hypothesis: "Hypothesis", observation: "Observation from drawings", question: "Open question",
    return: "Return feedback to Design", returned: "Response saved and returned to Design.",
    revisions: "Version and feedback history", version: "Version", reviewFrom: "Review", noReview: "Awaiting review",
    goDesign: "Open Design", goMarketing: "Open Marketing", goTest: "Open Test Drive",
    newSketch: "Sketch", noSketch: "No sketches attached yet.", hintVersion: "Each submission creates an immutable version, including selected images.",
    status: "Current focus", result: "Version under review", back: "Returned to Design", onlyManual: "Participants enter all content and critical assessments manually.",
  },
} as const;

const textAreaClass = "mt-2 min-h-[110px] w-full resize-y rounded-lg border border-foreground/20 bg-transparent p-3 text-[13px] font-light leading-[1.7] text-foreground/85 outline-none placeholder:text-foreground/35 focus-visible:border-primary disabled:opacity-50";
const buttonClass = "min-h-11 rounded-full border border-foreground/30 px-4 py-2 text-[12px] font-light text-foreground/85 hover:border-foreground/55 disabled:cursor-not-allowed disabled:opacity-35";
const cardClass = "rounded-xl border border-foreground/15 p-4";
const mutedClass = "text-[11px] font-light leading-[1.65] text-foreground/55";

type Preview = EggDesignAsset & { url: string };

export const UnoEggDesignLoopPanel = ({ locale, node, loop, setLoop, originalMarketing, onNavigate }: Props) => {
  const m = copy[locale];
  const [images, setImages] = useState<Preview[]>([]);
  const [imageError, setImageError] = useState("");
  const [imagesReady, setImagesReady] = useState(false);
  const previews = useRef<string[]>([]);
  useEffect(() => {
    let closed = false;
    setImagesReady(false);
    void listEggDesignAssets().then((assets) => {
      if (closed) return;
      const records = assets.map((asset) => {
        const url = URL.createObjectURL(asset.blob);
        previews.current.push(url);
        return { ...asset, url };
      });
      setImages(records);
      setImagesReady(true);
    }).catch(() => { if (!closed) { setImageError(m.storageError); setImagesReady(true); } });
    return () => {
      closed = true;
      for (const url of previews.current) URL.revokeObjectURL(url);
      previews.current = [];
    };
  }, [m.storageError]);

  const setField = (patch: Partial<DesignLoop>) => setLoop((prev) => prev ? { ...prev, ...patch } : prev);
  const uploadImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    setImageError("");
    if (!imagesReady) return;
    const slots = Math.min(4 - loop.imageIds.length, 24 - images.length);
    if (files.length > slots) { setImageError(m.imageLimit); return; }
    const stored: Preview[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
        setImageError(m.wrongFile);
        continue;
      }
      const asset: EggDesignAsset = {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `sketch-${Date.now()}-${Math.random()}`,
        name: file.name, createdAt: Date.now(), blob: file,
      };
      try {
        await putEggDesignAsset(asset);
        const url = URL.createObjectURL(file);
        previews.current.push(url);
        stored.push({ ...asset, url });
      } catch {
        setImageError(m.storageError);
      }
    }
    if (stored.length) {
      setImages((old) => [...old, ...stored]);
      setLoop((prev) => prev?.status === "design"
        ? { ...prev, imageIds: [...prev.imageIds, ...stored.map((item) => item.id)] } : prev);
    }
  };

  const latest = latestDesignSubmission(loop);
  const canReview = loop.status === node && node !== "design" && latest?.destination === node;
  const draft = node === "marketing" ? loop.marketingDraft : loop.testDraft;
  const evidence = node === "marketing" ? loop.marketingEvidence : loop.testEvidence;
  const buttonLabel = (target: Node) => target === "design" ? m.goDesign : target === "marketing" ? m.goMarketing : m.goTest;

  const ImageSet = ({ ids }: { ids: string[] }) => ids.length ? <div className="mt-3 grid grid-cols-2 gap-3">
    {ids.map((id) => {
      const img = images.find((asset) => asset.id === id);
      return <div key={id} className="min-w-0">
        {img ? <img src={img.url} alt={img.name} className="aspect-square w-full rounded-lg border border-foreground/10 object-contain" /> :
          <div className="flex aspect-square items-center justify-center border border-dashed border-foreground/20 p-3 text-center text-[11px] text-foreground/45">{m.missingImage}</div>}
        <p className="mt-1 truncate text-[10px] text-foreground/50">{img?.name ?? id}</p>
        {node === "design" && loop.status === "design" && ids === loop.imageIds && <button type="button"
          className="mt-1 text-[11px] underline decoration-foreground/30 underline-offset-4"
          onClick={() => setField({ imageIds: loop.imageIds.filter((current) => current !== id) })}>{m.imageRemove}</button>}
      </div>;
    })}
  </div> : <p className={mutedClass + " mt-2"}>{m.noSketch}</p>;

  return <div data-testid={`unocalc-design-loop-${node}`} className="w-full space-y-5 text-left">
    <p className="text-[10px] uppercase tracking-[0.12em] text-foreground/45">{m.eyebrow}</p>
    <p className={mutedClass}>{m.scope}</p>
    <div className={cardClass}>
      <p className={mutedClass}>{m.source}</p>
      <p className="mt-3 whitespace-pre-wrap break-words text-[13px] font-light leading-[1.7]">{loop.layer}</p>
      {node === "design" && !!originalMarketing && <div className="mt-4 border-t border-foreground/10 pt-3">
        <p className={mutedClass}>{m.initialMarket}</p>
        <p className="mt-2 whitespace-pre-wrap text-[12px] text-foreground/75">{originalMarketing}</p>
      </div>}
    </div>
    <div className={cardClass}>
      <p className={mutedClass}>{m.status}</p>
      <p className="mt-2 text-[14px]">
        {loop.status === "ready" ? m.readyDone :
          loop.status === "design" ? m.design :
          loop.status === "marketing" ? m.marketing : m.testDrive}
      </p>
      {loop.status === "marketing" && node === "design" && <p className={mutedClass + " mt-2"}>{m.waitingMarketing}</p>}
      {loop.status === "testDrive" && node === "design" && <p className={mutedClass + " mt-2"}>{m.waitingTest}</p>}
    </div>
    {node === "design" && loop.status === "design" && <>
      <div className={cardClass}>
        <h3 className="text-[16px] font-light">{m.work} · v{loop.submissions.length + 1}</h3>
        <p className={mutedClass + " mt-2"}>{m.descHint}</p>
        <label className="mt-3 block text-[12px]" htmlFor="egg-design-description">{m.desc}</label>
        <textarea id="egg-design-description" data-testid="unocalc-design-description"
          className={textAreaClass} value={loop.description} onChange={(event) => setField({ description: event.target.value })}
          rows={6} maxLength={6000} placeholder={m.descPlaceholder} />
        <label className="mt-4 block text-[12px]" htmlFor="egg-design-changes">{m.changes}</label>
        <textarea id="egg-design-changes" data-testid="unocalc-design-changes"
          className={textAreaClass + " min-h-[70px]"} value={loop.changeNote}
          onChange={(event) => setField({ changeNote: event.target.value })} rows={2} maxLength={1000}
          placeholder={m.changesPlaceholder} />
        <div className="mt-4 border-t border-foreground/10 pt-4">
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-foreground/30 px-4 py-2 text-[12px] text-foreground/85">
            {m.files}
            <input type="file" accept="image/*" multiple data-testid="unocalc-design-upload"
              className="sr-only" disabled={!imagesReady || loop.imageIds.length >= 4}
              onChange={(event) => { void uploadImages(event); }} />
          </label>
          <p className={mutedClass + " mt-2"}>{m.filesNote}</p>
          <p role="status" className={mutedClass + " mt-2"}>{imageError}</p>
          <ImageSet ids={loop.imageIds} />
        </div>
        <p className={mutedClass + " mt-4"}>{m.hintVersion}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" data-testid="unocalc-design-send-marketing" className={buttonClass}
            disabled={!canSendDesign(loop, "marketing")}
            onClick={() => { setLoop((prev) => prev ? sendDesign(prev, "marketing", Date.now()) : prev); onNavigate("marketing"); }}>
            {m.sendMarket}
          </button>
          <button type="button" data-testid="unocalc-design-send-test" className={buttonClass}
            disabled={!canSendDesign(loop, "testDrive")}
            onClick={() => { setLoop((prev) => prev ? sendDesign(prev, "testDrive", Date.now()) : prev); onNavigate("testDrive"); }}>
            {m.sendTest}
          </button>
        </div>
        {!hasMarketingReturn(loop) && <p className={mutedClass + " mt-2"}>{m.needsMarket}</p>}
      </div>
      {hasTestReturn(loop) && <div className={cardClass}>
        <p className={mutedClass}>{m.readyNote}</p>
        <button type="button" data-testid="unocalc-design-mark-ready" className={buttonClass + " mt-3"}
          disabled={!canMarkDesignReady(loop)}
          onClick={() => setLoop((prev) => prev ? markDesignReady(prev) : prev)}>{m.ready}</button>
      </div>}
    </>}
    {node === "design" && loop.status === "ready" && <div className={cardClass}>
      <p className={mutedClass}>{m.readyNote}</p>
      <button type="button" className={buttonClass + " mt-3"} data-testid="unocalc-design-reopen"
        onClick={() => setField({ status: "design" })}>{m.reopen}</button>
    </div>}
    {node === "design" && (loop.status === "marketing" || loop.status === "testDrive") && <button
      type="button" className={buttonClass} onClick={() => onNavigate(loop.status as DesignDestination)}>
        {buttonLabel(loop.status as DesignDestination)}
    </button>}
    {node !== "design" && canReview && latest && <div className={cardClass}>
      <h3 className="text-[16px] font-light">{m.received} · v{latest.version}</h3>
      <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-[1.7]">{latest.description}</p>
      {latest.changeNote && <p className={mutedClass + " mt-2"}>{latest.changeNote}</p>}
      <ImageSet ids={latest.imageIds} />
      <div className="mt-4 border-t border-foreground/10 pt-4">
        <h4 className="text-[13px] font-medium">{m.review}</h4>
        <p className={mutedClass + " mt-2"}>{node === "marketing" ? m.marketPrompt : m.testPrompt}</p>
        <label className="mt-3 block text-[12px]" htmlFor="egg-review-evidence">{m.evidence}</label>
        <select id="egg-review-evidence" data-testid="unocalc-design-review-evidence"
          value={evidence} onChange={(event) => setField(node === "marketing"
            ? { marketingEvidence: event.target.value as ReviewEvidence }
            : { testEvidence: event.target.value as ReviewEvidence })}
          className="mt-2 min-h-11 w-full rounded-lg border border-foreground/20 bg-background p-2 text-[13px]">
          <option value="hypothesis">{m.hypothesis}</option>
          <option value="observation">{m.observation}</option>
          <option value="question">{m.question}</option>
        </select>
        <textarea data-testid={`unocalc-design-${node}-feedback`} value={draft} rows={6} maxLength={5000}
          placeholder={m.reportPlaceholder} className={textAreaClass}
          onChange={(event) => setField(node === "marketing" ? { marketingDraft: event.target.value } : { testDraft: event.target.value })} />
        <button type="button" data-testid={`unocalc-design-${node}-return`} className={buttonClass + " mt-3"}
          disabled={!draft.trim()}
          onClick={() => { setLoop((prev) => prev ? returnDesignFeedback(prev, Date.now()) : prev); onNavigate("design"); }}>{m.return}</button>
      </div>
    </div>}
    {node !== "design" && !canReview && <div className={cardClass}>
      <p className={mutedClass}>{m.waitingDesign}</p>
      <button type="button" className={buttonClass + " mt-3"} onClick={() => onNavigate("design")}>{m.goDesign}</button>
    </div>}
    {loop.submissions.length > 0 && <div className={cardClass}>
      <h3 className="text-[15px] font-light">{m.revisions}</h3>
      <div className="mt-3 space-y-3">
        {[...loop.submissions].reverse().map((submission) => {
          const review = loop.feedback.find((item) => item.submissionId === submission.id);
          return <details key={submission.id} className="rounded-lg border border-foreground/10 p-3" open={submission.id === latest?.id}>
            <summary className="cursor-pointer text-[12px] font-medium">{m.version} {submission.version} · {submission.destination === "marketing" ? m.marketing : m.testDrive}</summary>
            <p className="mt-3 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-foreground/75">{submission.description}</p>
            {submission.changeNote && <p className={mutedClass + " mt-2"}>{submission.changeNote}</p>}
            <ImageSet ids={submission.imageIds} />
            {review ? <div className="mt-3 border-t border-foreground/10 pt-3">
              <p className={mutedClass}>{m.reviewFrom} · {review.source === "marketing" ? m.marketing : m.testDrive} ·
                {" "}{review.evidence === "hypothesis" ? m.hypothesis : review.evidence === "observation" ? m.observation : m.question}</p>
              <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed">{review.text}</p>
            </div> : <p className={mutedClass + " mt-3"}>{m.noReview}</p>}
          </details>;
        })}
      </div>
    </div>}
    <p className={mutedClass}>{m.onlyManual}</p>
  </div>;
};
