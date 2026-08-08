import Link from "next/link";
import { ActionForm, ModalShell } from "@/components/admin/action-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cloneExamAction, markCorrectOptionAction, reorderContentAction, saveOptionAction, saveQuestionAction, saveSectionAction, softDeleteContentAction, transitionExamAction, updateExamAction } from "@/lib/exams/actions";
import { accessTypeLabels, examStatusLabels } from "@/lib/exams/queries";

type Option = { id: string; content: string; position: number; is_correct: boolean; is_active: boolean; deleted_at: string | null };
type Question = { id: string; section_id: string; content: string; image_path: string | null; explanation: string | null; score: number; position: number; is_active: boolean; deleted_at: string | null; question_options: Option[] };
type Section = { id: string; title: string; description: string | null; position: number; questions: Question[] };
type Exam = {
  id: string; title: string; slug: string; description: string | null; status: keyof typeof examStatusLabels; access_type: keyof typeof accessTypeLabels;
  allow_guest_attempt: boolean; fullscreen_required: boolean; duration_minutes: number; total_score: number; subject_id: string; category_id: string | null;
  show_score_after_submit: boolean; show_answers_after_submit: boolean; show_solutions_after_submit: boolean;
};
type SelectItem = { id: string; name: string };

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="min-h-24 rounded-md border px-3 py-2 text-sm focus-visible:outline-2" />;
}

function Check({ label, name, defaultChecked, disabled }: { label: string; name: string; defaultChecked?: boolean; disabled?: boolean }) {
  return <label className="flex items-center gap-2 text-sm"><input name={name} type="checkbox" defaultChecked={defaultChecked} disabled={disabled} className="h-4 w-4" />{label}</label>;
}

function ValidationSummary({ sections }: { sections: Section[] }) {
  const issues = sections.flatMap((section, sectionIndex) => {
    const activeQuestions = section.questions.filter((q) => q.is_active && !q.deleted_at);
    const sectionIssues = activeQuestions.length === 0 ? [`Phần ${sectionIndex + 1} chưa có câu hỏi.`] : [];
    return sectionIssues.concat(activeQuestions.flatMap((question, questionIndex) => {
      const activeOptions = question.question_options.filter((option) => option.is_active && !option.deleted_at);
      const correct = activeOptions.filter((option) => option.is_correct);
      const number = questionIndex + 1;
      return [
        activeOptions.length < 2 ? `Câu ${number} chưa có đủ hai lựa chọn.` : null,
        correct.length !== 1 ? `Câu ${number} chưa có đáp án đúng.` : null,
      ].filter(Boolean) as string[];
    }));
  });
  if (sections.length === 0) issues.unshift("Đề thi phải có ít nhất một phần thi.");
  if (issues.length === 0) return <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Đề thi đã đủ điều kiện cơ bản để xuất bản.</p>;
  return <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-medium">Đề thi chưa thể xuất bản</p><ul className="mt-2 list-disc pl-5">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>;
}

export function ExamEditor({ exam, sections, subjects, categories }: { exam: Exam; sections: Section[]; subjects: SelectItem[]; categories: SelectItem[] }) {
  const isDraft = exam.status === "draft";
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm"><Link href="/admin/exams">Quay lại</Link></Button>
          <h1 className="text-2xl font-semibold">{exam.title}</h1>
          <div className="mt-2 flex gap-2"><Badge>{examStatusLabels[exam.status]}</Badge><Badge>Đã lưu</Badge></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft && <ConfirmTransition examId={exam.id} transition="publish" title="Xuất bản đề thi?" body="Sau khi xuất bản, nội dung phần thi, câu hỏi, đáp án và điểm sẽ bị khóa. Bạn có thể nhân bản đề để chỉnh sửa phiên bản mới." label="Xuất bản đề" />}
          {exam.status === "published" && <ConfirmTransition examId={exam.id} transition="return" title="Đưa đề về bản nháp?" body="Đề sẽ tạm thời không còn khả dụng để bắt đầu lượt thi mới." label="Đưa về bản nháp" />}
          {exam.status === "published" && <ConfirmTransition examId={exam.id} transition="close" title="Đóng đề?" body="Đóng đề sẽ ngăn người dùng bắt đầu lượt thi mới. Các lượt thi đã bắt đầu vẫn tiếp tục đến hết thời gian." label="Đóng đề" />}
          {(exam.status === "published" || exam.status === "closed") && <ConfirmTransition examId={exam.id} transition="archive" title="Lưu trữ đề thi?" body="Đề sẽ không còn xuất hiện trong danh sách đề khả dụng. Dữ liệu cũ vẫn được giữ lại." label="Lưu trữ" />}
          <CloneDialog exam={exam} />
        </div>
      </div>
      {!isDraft && <p className="rounded-md border bg-slate-50 p-3 text-sm">Đề thi đã được xuất bản. Nội dung câu hỏi hiện đang bị khóa.</p>}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="general" className="rounded-md border px-3 py-2">Thông tin chung</TabsTrigger>
          <TabsTrigger value="content" className="rounded-md border px-3 py-2">Phần thi và câu hỏi</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-md border px-3 py-2">Cài đặt</TabsTrigger>
          <TabsTrigger value="preview" className="rounded-md border px-3 py-2">Xem trước</TabsTrigger>
        </TabsList>
        <TabsContent value="general"><ExamMetaForm exam={exam} subjects={subjects} categories={categories} readOnly={!isDraft} /></TabsContent>
        <TabsContent value="content"><ContentEditor examId={exam.id} sections={sections} readOnly={!isDraft} /></TabsContent>
        <TabsContent value="settings"><ExamMetaForm exam={exam} subjects={subjects} categories={categories} readOnly={!isDraft} settingsOnly /></TabsContent>
        <TabsContent value="preview"><Preview exam={exam} sections={sections} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ExamMetaForm({ exam, subjects, categories, readOnly, settingsOnly = false }: { exam: Exam; subjects: SelectItem[]; categories: SelectItem[]; readOnly: boolean; settingsOnly?: boolean }) {
  return (
    <Card><CardHeader><CardTitle>{settingsOnly ? "Cài đặt" : "Thông tin chung"}</CardTitle></CardHeader><CardContent>
      <ActionForm action={updateExamAction} submitLabel="Lưu thay đổi" className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="id" value={exam.id} />
        {!settingsOnly && <>
          <label className="grid gap-1 text-sm md:col-span-2">Tiêu đề<Input name="title" defaultValue={exam.title} disabled={readOnly} /></label>
          <label className="grid gap-1 text-sm">Slug<Input name="slug" defaultValue={exam.slug} disabled={readOnly} /></label>
          <label className="grid gap-1 text-sm">Thời gian làm bài<Input name="durationMinutes" type="number" defaultValue={exam.duration_minutes} min={1} max={300} disabled={readOnly} /></label>
          <label className="grid gap-1 text-sm">Môn học<select name="subjectId" defaultValue={exam.subject_id} disabled={readOnly} className="h-10 rounded-md border px-3 text-sm">{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1 text-sm">Danh mục<select name="categoryId" defaultValue={exam.category_id ?? ""} disabled={readOnly} className="h-10 rounded-md border px-3 text-sm"><option value="">Không chọn</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1 text-sm md:col-span-2">Mô tả<TextArea name="description" defaultValue={exam.description ?? ""} disabled={readOnly} /></label>
        </>}
        {settingsOnly && <>
          <input type="hidden" name="title" value={exam.title} /><input type="hidden" name="slug" value={exam.slug} /><input type="hidden" name="durationMinutes" value={exam.duration_minutes} /><input type="hidden" name="subjectId" value={exam.subject_id} /><input type="hidden" name="categoryId" value={exam.category_id ?? ""} /><input type="hidden" name="description" value={exam.description ?? ""} />
        </>}
        <label className="grid gap-1 text-sm">Quyền truy cập<select name="accessType" defaultValue={exam.access_type} disabled={readOnly} className="h-10 rounded-md border px-3 text-sm">{Object.entries(accessTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="grid gap-2 md:col-span-2">
          <Check label="Cho phép Guest làm bài" name="allowGuestAttempt" defaultChecked={exam.allow_guest_attempt} disabled={readOnly} />
          <div>
            <Check label="Bắt buộc toàn màn hình" name="fullscreenRequired" defaultChecked={exam.fullscreen_required} disabled={readOnly} />
            <p className="pl-6 text-xs text-[var(--muted-foreground)] mt-0.5">
              Bật: Học sinh bắt buộc làm bài ở chế độ toàn màn hình. Tắt: Học sinh có thể làm bài ở chế độ bình thường.
            </p>
          </div>
          <Check label="Hiện điểm sau khi nộp" name="showScoreAfterSubmit" defaultChecked={exam.show_score_after_submit} disabled={readOnly} />
          <Check label="Hiện đáp án sau khi nộp" name="showAnswersAfterSubmit" defaultChecked={exam.show_answers_after_submit} disabled={readOnly} />
          <Check label="Hiện lời giải sau khi nộp" name="showSolutionsAfterSubmit" defaultChecked={exam.show_solutions_after_submit} disabled={readOnly} />
        </div>
      </ActionForm>
    </CardContent></Card>
  );
}

function ContentEditor({ examId, sections, readOnly }: { examId: string; sections: Section[]; readOnly: boolean }) {
  const sectionIds = sections.map((section) => section.id);
  return <div className="space-y-4"><ValidationSummary sections={sections} />{!readOnly && <SectionDialog examId={examId} position={sections.length + 1} />}{sections.map((section) => <SectionBlock key={section.id} examId={examId} section={section} sectionIds={sectionIds} readOnly={readOnly} />)}</div>;
}

function SectionBlock({ examId, section, sectionIds, readOnly }: { examId: string; section: Section; sectionIds: string[]; readOnly: boolean }) {
  const questions = section.questions.filter((q) => !q.deleted_at).sort((a, b) => a.position - b.position);
  const questionIds = questions.map((question) => question.id);
  return <Card><CardHeader><CardTitle>{section.position}. {section.title} <span className="text-sm font-normal">({questions.length} câu hỏi)</span></CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-[var(--muted-foreground)]">{section.description ?? "Không có mô tả"}</p>
    {!readOnly && <div className="flex flex-wrap gap-2"><SectionDialog examId={examId} section={section} position={section.position} /><DeleteButton examId={examId} table="exam_sections" id={section.id} /><QuestionDialog examId={examId} sectionId={section.id} position={questions.length + 1} /><MoveButtons examId={examId} kind="sections" parentId={examId} ids={sectionIds} currentId={section.id} /></div>}
    {questions.map((question, index) => <QuestionBlock key={question.id} examId={examId} question={question} questionIds={questionIds} number={index + 1} readOnly={readOnly} />)}
  </CardContent></Card>;
}

function QuestionBlock({ examId, question, questionIds, number, readOnly }: { examId: string; question: Question; questionIds: string[]; number: number; readOnly: boolean }) {
  const options = question.question_options.filter((o) => !o.deleted_at).sort((a, b) => a.position - b.position);
  const optionIds = options.map((option) => option.id);
  return (
    <div className="rounded-md border p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-medium">Câu {number}</h3>
          <p className="text-sm">{question.content}</p>
          <p className="text-sm text-[var(--muted-foreground)]">Điểm: {question.score}</p>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <QuestionDialog examId={examId} question={question} sectionId={question.section_id} position={question.position} />
            <DeleteButton examId={examId} table="questions" id={question.id} />
            <OptionDialog examId={examId} questionId={question.id} position={options.length + 1} />
            <MoveButtons examId={examId} kind="questions" parentId={question.section_id} ids={questionIds} currentId={question.id} />
          </div>
        )}
      </div>
      <div className="mt-3 space-y-2">
        {options.map((option, index) => (
          <div key={option.id} className="flex flex-col gap-3 rounded-md border px-3 py-2 text-sm md:flex-row md:items-center md:justify-between">
            <span>Lựa chọn {String.fromCharCode(65 + index)}: {option.content}</span>
            <div className="flex flex-wrap items-center gap-2">
              {option.is_correct ? <Badge>Đáp án đúng</Badge> : !readOnly && <MarkCorrectButton examId={examId} questionId={question.id} optionId={option.id} />}
              {!readOnly && (
                <>
                  <OptionDialog examId={examId} questionId={question.id} option={option} position={option.position} />
                  <MoveButtons examId={examId} kind="options" parentId={question.id} ids={optionIds} currentId={option.id} />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {question.explanation && (
        <details className="mt-3 text-sm">
          <summary>Lời giải</summary>
          <p>{question.explanation}</p>
        </details>
      )}
    </div>
  );
}

function SectionDialog({ examId, section, position }: { examId: string; section?: Section; position: number }) {
  return <ModalShell title={section ? "Sửa phần thi" : "Tạo phần thi"} trigger={<Button size="sm" variant="outline">{section ? "Sửa phần thi" : "Thêm phần thi"}</Button>}><ActionForm action={saveSectionAction} submitLabel="Lưu phần thi"><input type="hidden" name="examId" value={examId} />{section && <input type="hidden" name="sectionId" value={section.id} />}<label className="grid gap-1 text-sm">Tên phần thi<Input name="title" defaultValue={section?.title} required /></label><label className="grid gap-1 text-sm">Mô tả<TextArea name="description" defaultValue={section?.description ?? ""} /></label><label className="grid gap-1 text-sm">Vị trí<Input name="position" type="number" min={1} defaultValue={position} required /></label></ActionForm></ModalShell>;
}

function QuestionDialog({ examId, sectionId, question, position }: { examId: string; sectionId: string; question?: Question; position: number }) {
  return <ModalShell title={question ? "Sửa câu hỏi" : "Tạo câu hỏi"} trigger={<Button size="sm" variant="outline">{question ? "Sửa câu hỏi" : "Thêm câu hỏi"}</Button>}><ActionForm action={saveQuestionAction} submitLabel="Lưu câu hỏi"><input type="hidden" name="examId" value={examId} /><input type="hidden" name="sectionId" value={sectionId} />{question && <input type="hidden" name="questionId" value={question.id} />}<label className="grid gap-1 text-sm">Nội dung câu hỏi<TextArea name="content" defaultValue={question?.content ?? ""} required /></label><label className="grid gap-1 text-sm">Điểm<Input name="score" type="number" step="0.25" min="0.25" defaultValue={question?.score ?? 1} required /></label><label className="grid gap-1 text-sm">Lời giải<TextArea name="explanation" defaultValue={question?.explanation ?? ""} /></label><label className="grid gap-1 text-sm">Đường dẫn hình ảnh<Input name="imagePath" defaultValue={question?.image_path ?? ""} /></label><label className="grid gap-1 text-sm">Vị trí<Input name="position" type="number" min={1} defaultValue={position} required /></label><Check label="Đang hoạt động" name="isActive" defaultChecked={question?.is_active ?? true} /></ActionForm></ModalShell>;
}

function OptionDialog({ examId, questionId, option, position }: { examId: string; questionId: string; option?: Option; position: number }) {
  return <ModalShell title={option ? "Sửa lựa chọn" : "Thêm lựa chọn"} trigger={<Button size="sm" variant="outline">{option ? "Sửa" : "Thêm lựa chọn"}</Button>}><ActionForm action={saveOptionAction} submitLabel="Lưu lựa chọn"><input type="hidden" name="examId" value={examId} /><input type="hidden" name="questionId" value={questionId} />{option && <input type="hidden" name="optionId" value={option.id} />}<label className="grid gap-1 text-sm">Nội dung lựa chọn<Input name="content" defaultValue={option?.content ?? ""} required /></label><label className="grid gap-1 text-sm">Vị trí<Input name="position" type="number" min={1} defaultValue={position} required /></label><Check label="Đáp án đúng" name="isCorrect" defaultChecked={option?.is_correct ?? false} /><Check label="Đang hoạt động" name="isActive" defaultChecked={option?.is_active ?? true} /></ActionForm></ModalShell>;
}

function MarkCorrectButton({ examId, questionId, optionId }: { examId: string; questionId: string; optionId: string }) {
  return <ActionForm action={markCorrectOptionAction} submitLabel="Chọn đáp án đúng" pendingLabel="Đang chọn..." className="inline"><input type="hidden" name="examId" value={examId} /><input type="hidden" name="questionId" value={questionId} /><input type="hidden" name="optionId" value={optionId} /></ActionForm>;
}

function DeleteButton({ examId, table, id }: { examId: string; table: string; id: string }) {
  return <ActionForm action={softDeleteContentAction} submitLabel="Xóa mềm" pendingLabel="Đang xóa..." className="inline"><input type="hidden" name="examId" value={examId} /><input type="hidden" name="table" value={table} /><input type="hidden" name="id" value={id} /></ActionForm>;
}

function MoveButtons({ examId, kind, parentId, ids, currentId }: { examId: string; kind: string; parentId: string; ids: string[]; currentId: string }) {
  const index = ids.indexOf(currentId);
  const up = swapIds(ids, index, index - 1);
  const down = swapIds(ids, index, index + 1);
  return <div className="flex gap-1"><MoveForm label="Di chuyển lên" disabled={index <= 0} examId={examId} kind={kind} parentId={parentId} ids={up} /><MoveForm label="Di chuyển xuống" disabled={index < 0 || index >= ids.length - 1} examId={examId} kind={kind} parentId={parentId} ids={down} /></div>;
}

function MoveForm({ label, disabled, examId, kind, parentId, ids }: { label: string; disabled: boolean; examId: string; kind: string; parentId: string; ids: string[] }) {
  return <ActionForm action={reorderContentAction} submitLabel={label} pendingLabel="Đang sắp xếp..." className="inline" disabled={disabled}><input type="hidden" name="examId" value={examId} /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="parentId" value={parentId} />{ids.map((id) => <input key={id} type="hidden" name="orderedIds" value={id} />)}</ActionForm>;
}

function swapIds(ids: string[], from: number, to: number) {
  if (from < 0 || to < 0 || from >= ids.length || to >= ids.length) return ids;
  const next = [...ids];
  const current = next[from];
  const target = next[to];
  if (!current || !target) return ids;
  next[from] = target;
  next[to] = current;
  return next;
}

function ConfirmTransition({ examId, transition, title, body, label }: { examId: string; transition: string; title: string; body: string; label: string }) {
  return <ModalShell title={title} trigger={<Button size="sm">{label}</Button>}><p className="mb-4 text-sm text-[var(--muted-foreground)]">{body}</p><ActionForm action={transitionExamAction} submitLabel={label}><input type="hidden" name="examId" value={examId} /><input type="hidden" name="transition" value={transition} /></ActionForm></ModalShell>;
}

function CloneDialog({ exam }: { exam: Exam }) {
  return <ModalShell title="Nhân bản đề" trigger={<Button size="sm" variant="outline">Nhân bản đề</Button>}><ActionForm action={cloneExamAction} submitLabel="Nhân bản đề"><input type="hidden" name="sourceExamId" value={exam.id} /><label className="grid gap-1 text-sm">Tiêu đề mới<Input name="newTitle" defaultValue={`${exam.title} - Bản sao`} required /></label><label className="grid gap-1 text-sm">Slug mới<Input name="newSlug" defaultValue={`${exam.slug}-ban-sao`} required /></label></ActionForm></ModalShell>;
}

function Preview({ exam, sections }: { exam: Exam; sections: Section[] }) {
  return <Card><CardHeader><CardTitle>Xem trước đề thi</CardTitle></CardHeader><CardContent className="space-y-4"><div><h2 className="text-xl font-semibold">{exam.title}</h2><p className="text-sm text-[var(--muted-foreground)]">Thời gian: {exam.duration_minutes} phút - Tổng điểm: {exam.total_score}</p></div><ValidationSummary sections={sections} />{sections.map((section) => <section key={section.id} className="space-y-3"><h3 className="font-semibold">{section.title}</h3>{section.questions.filter((q) => !q.deleted_at).sort((a, b) => a.position - b.position).map((question, index) => <div key={question.id} className="rounded-md border p-3"><p className="font-medium">Câu {index + 1}: {question.content}</p><p className="text-sm">Điểm: {question.score}</p><div className="mt-2 space-y-1">{question.question_options.filter((o) => !o.deleted_at).sort((a, b) => a.position - b.position).map((option, optionIndex) => <p key={option.id} className="text-sm">{String.fromCharCode(65 + optionIndex)}. {option.content} {option.is_correct ? "(Đáp án đúng)" : ""}</p>)}</div>{question.explanation && <details className="mt-2 text-sm"><summary>Xem lời giải</summary>{question.explanation}</details>}</div>)}</section>)}</CardContent></Card>;
}
