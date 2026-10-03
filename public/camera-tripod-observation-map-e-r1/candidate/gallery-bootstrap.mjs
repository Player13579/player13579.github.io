const startup=globalThis.CameraTripodGalleryStartup.create({window:globalThis,document,navigator});
try{
  await startup.bootstrap();
  await import('./preview.mjs');
  if(document.body.dataset.error)startup.fail('pipelines',new Error(document.body.dataset.error));
}catch(error){
  startup.fail('pipelines',error);
}
