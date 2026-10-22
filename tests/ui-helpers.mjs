export async function openCameraOptions(page){if(!await page.locator('#cameraSettingsDialog').isVisible())await page.locator('#openCameraSettings').click();}
export async function closeCameraOptions(page){if(await page.locator('#cameraSettingsDialog').isVisible())await page.locator('#closeCameraSettings').click();}
export async function cameraSelect(page,id,value){await openCameraOptions(page);await page.locator(`#${id}`).selectOption(value);await closeCameraOptions(page);}
export async function cameraClick(page,id){await openCameraOptions(page);await page.locator(`#${id}`).click();}
