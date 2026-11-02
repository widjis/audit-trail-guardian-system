import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { newHireSchema, payloadHash } from '../../src/server/services/servicedesk-contract.js';

// Clean PDF rebuilt from the supplied SRF geometry. No completed form/signatures.
export async function renderSrf(input) {
  const data = newHireSchema.parse(input);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Service Request Form - ${data.request_id} revision ${data.revision}`);
  pdf.setAuthor('MTI ICT - ServiceDesk integration');
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const branding = await pdf.embedPng(await readFile(new URL('./assets/branding-header.png', import.meta.url)));
  let page = pdf.addPage([595.32, 841.92]), pageNumber = 1;
  const text = (x, y, value, size = 9, strong = false) => {
    const font = strong ? bold : normal;
    // Reject unsupported glyphs instead of silently corrupting names in a legal record.
    font.encodeText(String(value));
    page.drawText(String(value), { x, y: 841.92-y, size, font, color: rgb(0,0,0) });
  };
  const line = (x,y,end) => page.drawLine({ start:{x,y:841.92-y},end:{x:end,y:841.92-y},thickness:.7 });
  const check = (x,y,value) => {
    page.drawRectangle({x,y:841.92-y-13,width:13,height:13,borderWidth:.7,borderColor:rgb(0,0,0)});
    if(value) text(x+3,y+10,'X',9,true);
  };
  const footer = () => {
    line(50,810,545);
    text(50,823,`MTI-HRM-ICT-FRM-002_Rev.000 | Digital New Hire SRF | Request ${data.request_id} | r${data.revision} | Page ${pageNumber}`,6.6);
  };
  const continuation = () => { footer(); page=pdf.addPage([595.32,841.92]);pageNumber++;text(50,50,`Service Request Form - ${data.request_id} - continuation`,13,true); };
  function wrap(value,width,size=9,strong=false) {
    const font=strong?bold:normal, output=[];
    for(const paragraph of String(value).split(/\r?\n/)) {
      let row='';
      for(const char of paragraph) {
        if(font.widthOfTextAtSize(row+char,size)>width && row) {output.push(row);row='';}
        row+=char;
      }
      output.push(row);
    }
    return output;
  }
  let y=0;
  function rows(x,value,width=460,size=9,strong=false) {
    for(const row of wrap(value,width,size,strong)) {
      if(y>780) {continuation();y=76;}
      text(x,y,row,size,strong);y+=size+4;
    }
  }
  page.drawImage(branding,{x:50,y:841.92-76,width:495,height:60});
  line(50,83,530);line(50,103,530);text(207,98,'Service Request Form',16,true);
  text(52,127,'1 - General Information',10,true);
  const employee=data.employee;
  const general=[['Name',employee.name],['Department',employee.department_name],['Title / Position',employee.title],
    ['Position Grade',employee.position_grade],['Employee ID',employee.employee_id||'Not yet assigned'],
    ['Join Date',employee.join_date],['Direct Manager',employee.direct_manager_name]];
  y=144;
  for(const [label,value] of general) {
    text(70,y,label);text(155,y,':');
    rows(170,value,355);y+=1;
  }
  y+=20;rows(52,'2 - Request',480,10,true);y+=2;
  check(163,y-9,true);text(70,y+2,'Type of Request:');text(181,y+2,'New Request');y+=30;
  rows(70,'Equipment Details:',460,9,true);
  check(68,y-9,data.requirements.equipment==='Desktop');text(85,y+2,'Desktop');
  check(286,y-9,data.requirements.equipment==='Notebook');text(303,y+2,'Notebook');y+=22;
  rows(70,'ICT determines equipment specifications.',460,8);y+=12;
  rows(70,'Network & Internet Access:',460,9,true);
  for(const [label,value] of [['User Login (AD)',data.requirements.ad_login],['Email Account',data.requirements.email_account],
    ['Mailing List (Email Group)',data.requirements.mailing_lists.length>0],['Shared Folder',data.requirements.shared_folders.length>0]]) {
    check(68,y-9,value);text(85,y+2,label);y+=18;
  }
  y+=8;
  if(data.requirements.mailing_lists.length) rows(85,`Mailing lists: ${data.requirements.mailing_lists.join('; ')}`,440,8);
  for(const folder of data.requirements.shared_folders) rows(85,`Shared folder: ${folder.path} (${folder.access})`,440,8);
  y+=18;rows(52,'3 - Justification for specific request:',480,10,true);
  rows(70,data.notes||'New Hire ICT setup as requested and approved in ServiceDesk.',460,9);
  y+=25;
  // Keep a complete authorization block together, with continuation if needed.
  if(y+215>780) {continuation();y=80;}
  rows(52,'4 - Authorization',480,10,true);y+=10;
  rows(70,`Requested by: ${data.requester.name}`,460,9,true);
  rows(70,'Role: Talent Acquisition',460,8);y+=12;
  for(const approval of data.approvals) {
    rows(70,`Approved by: ${approval.approver_name}`,460,9,true);
    rows(70,`Role: ${approval.stage==='hr'?'HR Manager / Superintendent':'Site IT Head / Superintendent'}`,460,8);
    rows(70,`Electronic decision: APPROVED | ${approval.decided_at} | User ID ${approval.approver_id}`,460,7.5);
    if(approval.comment) rows(70,`Comment: ${approval.comment}`,460,8);
    y+=12;
  }
  rows(52,'Approval evidence is the retained ServiceDesk decision record; this document does not reproduce handwritten signatures.',480,7);
  rows(52,`Approved data SHA-256: ${payloadHash(data)}`,480,6.5);
  footer();
  return Buffer.from(await pdf.save());
}
