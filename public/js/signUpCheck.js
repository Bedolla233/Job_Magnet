// Code created with bootstrap
// Example starter JavaScript for disabling form submissions if there are invalid fields
document.querySelector("#createBtn", (function () {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  var forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.prototype.slice.call(forms)
    .forEach(function (form) {
      form.addEventListener('submit', function (event) {
        console.log('Form submitted');
        if (!form.checkValidity()) {
          event.preventDefault()
          event.stopPropagation()
        }

        form.classList.add('was-validated')
      }, false)
    })
})())

document.querySelector("#inputEmail").addEventListener('keyup', async function() {
  const emailError = document.querySelector('#inputEmail + .invalid-feedback');
  const emailInput = document.getElementById('inputEmail');
  emailError.textContent = '';
  emailInput.setCustomValidity('');

  const email = emailInput.value.trim();

  if (email) {
    try {
      const response = await fetch('/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (!response.ok) {
        emailError.textContent = data.message;
        emailInput.setCustomValidity(data.message);
        emailInput.classList.add('is-invalid');
        return;
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
}); // Created with assistance

document.querySelector("#inputPassword").addEventListener("keyup", checkPass);
document.querySelector("#inputPasswordAgain").addEventListener("keyup", checkPass);

function checkPass() {
  var pass = document.querySelector("#inputPassword").value;
  var passAgain = document.querySelector("#inputPasswordAgain").value;
  if (pass != passAgain) {
    document.querySelector("#inputPasswordAgain").setCustomValidity("Passwords do not match");
    document.querySelector("#errorMsg").innerText = "Passwords do not match";
  } else {
    document.querySelector("#inputPasswordAgain").setCustomValidity("");
    document.querySelector("#errorMsg").innerText = "Please retype password";
  }
}