// Реквизиты оператора персональных данных. Заполняет владелец сервиса (решение O-2 в PLAN.md).
// Пока поля пустые, на страницах политики и соглашения видны пометки «[уточнить]».
window.ROD_OPERATOR = {
  version: '0.1-черновик',          // версия текстов: меняется — пользователи заново подтверждают согласие
  date: '20 октября 2026 г.',
  name: '',                         // ИП Фамилия Имя Отчество или ООО «…»
  ogrn: '',
  inn: '',
  address: '',                      // адрес для почтовых обращений
  email: '',                        // адрес для обращений по персональным данным
  storage: ''                       // где физически хранятся данные: «серверы на территории Российской Федерации (…провайдер…)»
};
(function () {
  var O = window.ROD_OPERATOR;
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-op]').forEach(function (el) {
      var v = O[el.getAttribute('data-op')];
      el.textContent = v || '[уточнить]';
      if (!v) el.classList.add('todo');
    });
  });
})();
