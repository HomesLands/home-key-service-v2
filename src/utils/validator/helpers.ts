export function normalizeError(errors) {
  let errorArr = [];
  errors.map((error) => {
    Object.keys(error.constraints).map((errorKey) => {
      errorArr.push(error.constraints[errorKey]);
    });
  });

  return errorArr;
}
