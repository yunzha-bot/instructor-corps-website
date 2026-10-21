import { readProfile } from '../data';
import { escapeHtml } from './html';

export function profileEditorMarkup() {
  const profile = readProfile();
  return `<h2>EDIT PROFILE<small>编辑本人资料</small></h2>
    <form id="corps-profile-form" class="corps-profile-form">
      <p class="profile-form-note">按档案字段逐项填写。当前为本浏览器演示，组织资料正式上线后需核验。</p>
      <label class="profile-name">展示昵称<input name="nickname" required maxlength="24" value="${escapeHtml(profile.nickname)}" /></label>
      <div class="profile-field-grid">
        <label>所属分队<input name="team" maxlength="40" placeholder="待补充分队" value="${escapeHtml(profile.team || '')}" /></label>
        <label>所属届别<input name="cohort" maxlength="24" placeholder="待补充届别" value="${escapeHtml(profile.cohort || '')}" /></label>
        <label>加入时间<input name="joined" type="date" value="${escapeHtml(profile.joined || '')}" /></label>
        <label>队内身份<input name="role" maxlength="40" placeholder="待确认" value="${escapeHtml(profile.role || '')}" /></label>
      </div>
      <p role="alert" id="profile-error"></p>
      <button class="solid-button" type="submit">SAVE PROFILE<span>保存资料</span></button>
    </form>`;
}
