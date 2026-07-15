

//
// Peak flow using Curve Number technology
// USDA Forest Service, Rocky Mountain Research Station, Moscow, ID
// forest.moscowfsl.wsu.edu/ermit/peakflow/
//

version = '2015.04.05';

// ToFixed is now stanard to Javascript so the fixed variable could be removed and all the if (fixed) statements could be removed
fixed = false
dummy=1
if (dummy.toFixed) {fixed=true}

winHeight=640
winWidth=1280
h_padding=0;
v_padding=0;

function arg( name ) {
  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp( regexS );
  var results = regex.exec( window.location.href );
  if( results == null )
    return "";
  else
    return results[1];
}

function popuphistory() {
  height=500;
  width=660;
  pophistory = window.open('','pophistory','toolbar=no,location=no,status=no,directories=no,menubar=no,scrollbars=yes,resizable=yes,width='+width+',height='+height);
  pophistory.document.writeln('<html>')
  pophistory.document.writeln(' <head>')
  pophistory.document.writeln('  <title>FS Peak Flow Calculator version history</title>')
  pophistory.document.writeln(' </head>')
  pophistory.document.writeln(' <body bgcolor=white>')
  pophistory.document.writeln('  <font face="trebuchet, tahoma, arial, helvetica, sans serif">')
  pophistory.document.writeln('  <center>')
  pophistory.document.writeln('   <h4>FS Peak Flow Calculator version history</h4>')
  pophistory.document.writeln('   <p>')
  pophistory.document.writeln('   <table border=0 cellpadding=10>')
  pophistory.document.writeln('    <tr>')
  pophistory.document.writeln('     <th bgcolor=lightblue>Version</th>')
  pophistory.document.writeln('     <th bgcolor=lightblue>Comments</th>')
  pophistory.document.writeln('    </tr>')
  pophistory.document.writeln('    <tr>')
  pophistory.document.writeln('     <th valign=top bgcolor=lightblue>2015.04.05</th>')
  pophistory.document.writeln('     <td>Added culvert diameter calculation</td>')
  pophistory.document.writeln('    </tr>')
  pophistory.document.writeln('    <tr>')
  pophistory.document.writeln('     <th valign=top bgcolor=lightblue>2012.08.02</th>')
  pophistory.document.writeln('     <td>Added run logging capability</td>')
  pophistory.document.writeln('    </tr>')
  pophistory.document.writeln('    <tr>')
  pophistory.document.writeln('     <th valign=top bgcolor=lightblue>2012.07.26</th>')
  pophistory.document.writeln('     <td>Linkage to/from Online GIS WEPP and color code input fields</td>')
  pophistory.document.writeln('    </tr>')
  pophistory.document.writeln('    <tr>')
  pophistory.document.writeln('     <th valign=top bgcolor=lightblue>2012.06.25</th>')
  pophistory.document.writeln('     <td>Adjust US units calculation for q<sub>u</sub></td>')
  pophistory.document.writeln('    </tr>')
  pophistory.document.writeln('    <tr>')
  pophistory.document.writeln('     <th valign=top bgcolor=lightblue>2012.04.20</th>')
  pophistory.document.writeln('     <td>Full release, summarize post-fire CN values</td>')
  pophistory.document.writeln('    </tr>')
  pophistory.document.writeln('    <tr>')
  pophistory.document.writeln('     <th valign=top bgcolor=lightblue>2010.10.28</th>')
  pophistory.document.writeln('     <td>Beta release</td>')
  pophistory.document.writeln('    </tr>')
  pophistory.document.writeln('   </table>')
  pophistory.document.writeln('   </font>')
  pophistory.document.writeln('  </center>')
  pophistory.document.writeln(' </body>')
  pophistory.document.writeln('</html>')
  pophistory.document.close()
  pophistory.focus()
}

function TransferTcag() {
  document.PeakFlow.Tc.value=document.PeakFlow.Tcag.value
  document.PeakFlow.Tc_.value=document.PeakFlow.Tcag.value
  Calculate_SI()
}

function TransferCN() {
  document.PeakFlow.CN.value=document.PeakFlow.CNforest.value
  document.PeakFlow.CN_.value=document.PeakFlow.CNforest.value
  Calculate_SI()
}

function validate() {
  ClearResults()
  if (!isNumber(document.PeakFlow.Q.value))  {document.PeakFlow.Q.value = ''; document.PeakFlow.Q_.value = ''}
  if (!isNumber(document.PeakFlow.P.value))  {document.PeakFlow.P.value = ''; document.PeakFlow.P_.value = ''}
  if (!isNumber(document.PeakFlow.A.value))  {document.PeakFlow.A.value = ''; document.PeakFlow.A_.value = ''}
  if (!isNumber(document.PeakFlow.L.value))  {document.PeakFlow.L.value = ''; document.PeakFlow.L_.value = ''}
  if (!isNumber(document.PeakFlow.Sg.value)) {document.PeakFlow.Sg.value =''; document.PeakFlow.Sg_.value =''}
  if (!isNumber(document.PeakFlow.Tc.value)) {document.PeakFlow.Tc.value =''; document.PeakFlow.Tc_.value =''}
  if (!isNumber(document.PeakFlow.CN.value)) {document.PeakFlow.CN.value =''; document.PeakFlow.CN_.value =''}
  if (!isNumber(document.PeakFlow.Fp.value)) {document.PeakFlow.Fp.value =''; document.PeakFlow.Fp_.value =''}
  if (!isNumber(document.PeakFlow.h.value))  {document.PeakFlow.h.value =''; document.PeakFlow.h_.value =''}

  if (document.PeakFlow.Q.value <= 0)   {document.PeakFlow.Q.value = '';  document.PeakFlow.Q_.value = ''}
  if (document.PeakFlow.P.value <= 0)   {document.PeakFlow.P.value = '';  document.PeakFlow.P_.value = ''}
  if (document.PeakFlow.A.value <= 0)   {document.PeakFlow.A.value = '';  document.PeakFlow.A_.value = ''}
  if (document.PeakFlow.L.value <= 0)   {document.PeakFlow.L.value = '';  document.PeakFlow.L_.value = ''}
  if (document.PeakFlow.Sg.value < 0)   {document.PeakFlow.Sg.value = ''; document.PeakFlow.Sg_.value = ''}
  if (document.PeakFlow.Sg.value > 100) {document.PeakFlow.Sg.value = ''; document.PeakFlow.Sg_.value = ''}
  if (document.PeakFlow.Tc.value < 0.1) {document.PeakFlow.Tc.value = ''; document.PeakFlow.Tc_.value = ''}
  if (document.PeakFlow.Tc.value > 10)  {document.PeakFlow.Tc.value = ''; document.PeakFlow.Tc_.value = ''}
  if (document.PeakFlow.CN.value < 15)  {document.PeakFlow.CN.value = ''; document.PeakFlow.CN_.value = ''}
  if (document.PeakFlow.CN.value > 100) {document.PeakFlow.CN.value = ''; document.PeakFlow.CN_.value = ''}
  if (document.PeakFlow.Fp.value < 0)   {document.PeakFlow.Fp.value = ''; document.PeakFlow.Fp_.value = ''}
  if (document.PeakFlow.Fp.value > 1)   {document.PeakFlow.Fp.value = ''; document.PeakFlow.Fp_.value = ''}
  if (document.PeakFlow.h.value < 1)    {document.PeakFlow.h.value = ''; document.PeakFlow.h_.value = ''}
  if (document.PeakFlow.h.value > 60)   {document.PeakFlow.h.value = ''; document.PeakFlow.h_.value = ''}
}

function Calculate_SI() {
  //transfer SI input values to US values
  //if all have values ...
  validate()
  var Q = document.PeakFlow.Q.value
  if (isNumber(Q)) {
    Q = Q / 25.4				// mm to in
    if (Q.toFixed(1)) Q=Q.toFixed(1)
    document.PeakFlow.Q_.value=Q
  }
  var P = document.PeakFlow.P.value
  if (isNumber(P)) {
    P = P / 25.4				// mm to in
    if (fixed) P=P.toFixed(1)
    document.PeakFlow.P_.value=P
  }
  var A = document.PeakFlow.A.value
  if (isNumber(A)) {
    A = A * 2.471				// ha to ac
    if (fixed) A=A.toFixed(1)
    document.PeakFlow.A_.value=A
  }
  var L = document.PeakFlow.L.value
  if (isNumber(L)) {
    L = L * 3.281				// m to ft
    if (fixed) L=L.toFixed(1)
    document.PeakFlow.L_.value=L
  }
  var h = document.PeakFlow.h.value
  if (isNumber(h)) {
    h = h * 3.281				// m to ft
    if (fixed) h=h.toFixed(1)
    document.PeakFlow.h_.value=h
  }
  document.PeakFlow.Sg_.value = document.PeakFlow.Sg.value
  document.PeakFlow.Tc_.value = document.PeakFlow.Tc.value
  document.PeakFlow.CN_.value = document.PeakFlow.CN.value
  document.PeakFlow.Fp_.value = document.PeakFlow.Fp.value

  Calc_Tc()
  Estimate_CN()
  Estimate_SurfaceStorage()
  Estimate_RainfallFraction()
  Estimate_qu()
  Calc_q()
  Calc_D()

  //transfer SI results to US values

  document.PeakFlow.CN_.value = document.PeakFlow.CN.value
  var S = document.PeakFlow.S.value
  if (isNumber(S)) {
    S = S / 25.4				// mm to in
    if (fixed) S=S.toFixed(2)
    document.PeakFlow.S_.value=S
  }
  var Ia = document.PeakFlow.Ia.value
  if (isNumber(Ia)) {
    Ia = Ia / 25.4				// mm to in
    if (fixed) Ia=Ia.toFixed(2)
    document.PeakFlow.Ia_.value=Ia
  }
  document.PeakFlow.IaOnP_.value = document.PeakFlow.IaOnP.value
  var qu = document.PeakFlow.qu.value
  if (isNumber(qu)) {
    qu = qu * 35.31 / 2.471 / 25.4		// 1 m^3 per 35.31 ft^3, 1 ha per 2.471 ac, 25.4 mm per in
    if (fixed) qu=qu.toFixed(4)
    document.PeakFlow.qu_.value=qu
  }
  var q = document.PeakFlow.q.value
  if (isNumber(q)) {
    q = q * 35.31				// cubic meters per second to cubic feet per second
    if (fixed) q=q.toFixed(2)
    document.PeakFlow.q_.value=q
  }
  var D = document.PeakFlow.D.value
  if (isNumber(D)) {
    D = D * 2.54				// inches to cm
    if (fixed) q=q.toFixed(2)
    document.PeakFlow.D_.value=D
  }
}

function Calculate_US() {
  //transfer US input values to SI values
  //if all have values ...
  var Q_ = document.PeakFlow.Q_.value
  if (isNumber(Q_)) {
    Q_ = Q_ * 25.4				// in to mm
    if (fixed) Q_=Q_.toFixed(1)
    document.PeakFlow.Q.value=Q_
  }
  var P_ = document.PeakFlow.P_.value
  if (isNumber(P_)) {
    P_ = P_ * 25.4				// in to mm
    if (fixed) P_=P_.toFixed(1)
    document.PeakFlow.P.value=P_
  }
  var A_ = document.PeakFlow.A_.value
  if (isNumber(A_)) {
    A_ = A_ / 2.471				// ac to ha
    if (fixed) A_=A_.toFixed(1)
    document.PeakFlow.A.value=A_
  }
  var L_ = document.PeakFlow.L_.value
  if (isNumber(L_)) {
    L_ = L_ / 3.281				// ft to m
    if (fixed) L_=L_.toFixed(1)
    document.PeakFlow.L.value=L_
  }
  var h_ = document.PeakFlow.h_.value
  if (isNumber(h_)) {
    h_ = h_ / 3.281				// ft to m
    if (fixed) h_=h_.toFixed(1)
    document.PeakFlow.h.value=h_
  }
  document.PeakFlow.Sg.value = document.PeakFlow.Sg_.value
  document.PeakFlow.Tc.value = document.PeakFlow.Tc_.value
  document.PeakFlow.CN.value = document.PeakFlow.CN_.value
  document.PeakFlow.Fp.value = document.PeakFlow.Fp_.value

  Calc_Tc()
  Estimate_CN()
  Estimate_SurfaceStorage()
  Estimate_RainfallFraction()
  Estimate_qu()
  Calc_q()
  Calc_D()

  //transfer SI results to US values

  document.PeakFlow.CN_.value = document.PeakFlow.CN.value
  var S = document.PeakFlow.S.value
  if (isNumber(S)) {
    S = S / 25.4				// mm to in
    if (fixed) S=S.toFixed(2)
    document.PeakFlow.S_.value=S
  }
  var Ia = document.PeakFlow.Ia.value
  if (isNumber(Ia)) {
    Ia = Ia / 25.4				// mm to in
    if (fixed) Ia=Ia.toFixed(2)
    document.PeakFlow.Ia_.value=Ia
  }
  document.PeakFlow.IaOnP_.value = document.PeakFlow.IaOnP.value
  var qu = document.PeakFlow.qu.value
  if (isNumber(qu)) {
    qu = qu * 35.31 / 2.471 / 25.4		// 1 m^3 per 35.31 ft^3, 1 ha per 2.471 ac, 25.4 mm per in
    if (fixed) qu=qu.toFixed(4)
    document.PeakFlow.qu_.value=qu
  }
  var q = document.PeakFlow.q.value
  if (isNumber(q)) {
    q = q * 35.31				// cubic meters per second to cubic feet per second
    if (fixed) q=q.toFixed(2)
    document.PeakFlow.q_.value=q
  }
  var D = document.PeakFlow.D.value
  if (isNumber(D)) {
    D = D / 2.54				// cm to inches
    if (fixed) D=D.toFixed(2)
    document.PeakFlow.D_.value=D
  }
}

function ClearResults() {
  document.PeakFlow.S.value = ''
  document.PeakFlow.S_.value = ''
  document.PeakFlow.Ia.value = ''
  document.PeakFlow.Ia_.value = ''
  document.PeakFlow.IaOnP.value = ''
  document.PeakFlow.IaOnP_.value = ''
  document.PeakFlow.qu.value = ''
  document.PeakFlow.qu_.value = ''
  document.PeakFlow.q.value = ''
  document.PeakFlow.q_.value = ''
  document.PeakFlow.D.value = ''
  document.PeakFlow.D_.value = ''
}

function Calc_Tc() {
  var Sg = document.PeakFlow.Sg.value		// Sg = average watershed gradient (m/m)
  var CN = document.PeakFlow.CN.value		// CN = runoff curve number
  var L  = document.PeakFlow.L.value		//  L = longest flow length (m)
  if (isNumber(Sg) && isNumber(CN) && isNumber(L)) {
    var num = Math.pow((1000/CN)-9,0.7)
    var den = 4407 * Math.pow(Sg,0.5)
    Tc = Math.pow(L,0.8) * num / den		// calculate Tc time of concentration (h) from equation 5.12
  }
  else {
    Tc = ''
    ClearResults()
  }
  document.PeakFlow.Tcag.value = Tc		//  alert(Tc)
  if (isNumber(Tc) && Tc.toFixed(2)) {
    document.PeakFlow.Tcag.value = Tc.toFixed(2)
  }
  else {}
}

function Estimate_SurfaceStorage() {
  var CN = document.PeakFlow.CN.value		// CN = runoff curve number
  document.PeakFlow.S.value = ''
  document.PeakFlow.Ia.value = ''
  if (isNumber(CN)) {
    S  = (25400/CN)-254				// S  = Surface storage
    Ia = 0.2 * S
    document.PeakFlow.S.value = S		// alert (S)
    document.PeakFlow.Ia.value = Ia
    if (isNumber(S) && fixed) {
      document.PeakFlow.S.value = S.toFixed(0)
    }
    if (isNumber(Ia) && fixed) {
      document.PeakFlow.Ia.value = Ia.toFixed(1)
    }
  }
  else {
    ClearResults()
  }
}

function Estimate_CN() {			// From Iowa Stormwater Management Manual 2C-5 NRCS TR-55 Methodology
  var Q = document.PeakFlow.Q.value		// Q = runoff depth from a 24-h storm of the desired period (mm)
  var P = document.PeakFlow.P.value 		// P  = 24-h rainfall with a return period equal to the return period of the peak flow (mm)
  var CN = ''
  document.PeakFlow.CNforest.value = ''
  if (isNumber(Q) && isNumber(P)) {
    CN = 25400/((0.4*P+0.8*Q-Math.pow(Math.pow(0.4*P+0.8*Q,2)-0.16*(P*P-Q*P),0.5))/0.08+254)
    document.PeakFlow.CNforest.value = CN
    if (isNumber(CN) && fixed) {
      document.PeakFlow.CNforest.value = CN.toFixed(0)
    }
  }
  else {
    ClearResults()
  }
}

function Estimate_RainfallFraction() {
  var Ia = document.PeakFlow.Ia.value		// Ia = runoff curve number
  var P  = document.PeakFlow.P.value 		// P  = 24-h rainfall with a return period equal to the return period of the peak flow
  IaOnP=''
  if (isNumber(Ia) && isNumber(P)) {
    IaOnP = Ia/P
    document.PeakFlow.IaOnP.value = IaOnP		// alert (IaOnP)
    if (isNumber(IaOnP) && fixed) {
      document.PeakFlow.IaOnP.value = IaOnP.toFixed(2)
    }
  }
  else {
    ClearResults()
  }
}

function Estimate_qu() {			// From figure 5.4
  var tc  = document.PeakFlow.Tc.value
  var iap = document.PeakFlow.IaOnP.value

// use upper and lower curve on Ia/P instead of dropping off   2010.07.15

  qu = ''
  if (isNumber(tc) && isNumber(iap)) {
    if (tc < .1) {qu=''}
    else if (tc <= .2) {
      if (iap <= .30) {qu=twodinterp(iap,tc,.10,.30,.1,.2,4.60,4.10,3.44,3.00)}
      else if (iap <= .35) {qu=twodinterp(iap,tc,.30,.35,.1,.2,4.10,3.80,3.00,2.28)}
      else if (iap <= .40) {qu=twodinterp(iap,tc,.35,.40,.1,.2,3.80,3.50,2.28,2.47)}
      else if (iap <= .45) {qu=twodinterp(iap,tc,.40,.45,.1,.2,3.50,3.00,2.47,2.90)}
      else if (iap <= .50) {qu=twodinterp(iap,tc,.45,.50,.1,.2,3.00,2.28,2.90,1.60)}
      else {qu=twodinterp(iap,tc,.45,.50,.1,.2,3.00,2.28,2.90,1.60)}
    }
    else if (tc <= .4) {
      if (iap <= .30) {qu=twodinterp(iap,tc,.10,.30,.2,.4,3.44,3.00,2.55,2.10)}
      else if (iap <= .35) {qu=twodinterp(iap,tc,.30,.35,.2,.4,3.00,2.82,2.10,1.88)}
      else if (iap <= .40) {qu=twodinterp(iap,tc,.35,.40,.2,.4,2.82,2.47,1.88,1.70)}
      else if (iap <= .45) {qu=twodinterp(iap,tc,.40,.45,.2,.4,2.47,2.90,1.70,1.42)}
      else if (iap <= .50) {qu=twodinterp(iap,tc,.45,.50,.2,.4,2.90,1.60,1.42,1.15)}
      else {qu=twodinterp(iap,tc,.45,.50,.2,.4,2.90,1.60,1.42,1.15)}
    }
    else if (tc <= .6) {
      if (iap <= .30) {qu=twodinterp(iap,tc,.10,.30,.4,.6,2.55,2.10,1.95,1.67)}
      else if (iap <= .35) {qu=twodinterp(iap,tc,.30,.35,.4,.6,2.10,1.88,1.67,1.51)}
      else if (iap <= .40) {qu=twodinterp(iap,tc,.35,.40,.4,.6,1.88,1.70,1.51,1.38)}
      else if (iap <= .45) {qu=twodinterp(iap,tc,.40,.45,.4,.6,1.70,1.42,1.38,1.15)}
      else if (iap <= .50) {qu=twodinterp(iap,tc,.45,.50,.4,.6,1.42,1.15,1.15,0.95)}
      else {qu=twodinterp(iap,tc,.45,.50,.4,.6,1.42,1.15,1.15,0.95)}
    }
    else if (tc <= .8) {
      if (iap <= .30) {qu=twodinterp(iap,tc,.10,.30,.6,.8,1.95,1.67,1.70,1.49)}
      else if (iap <= .35) {qu=twodinterp(iap,tc,.30,.35,.6,.8,1.67,1.51,1.49,1.33)}
      else if (iap <= .40) {qu=twodinterp(iap,tc,.35,.40,.6,.8,1.51,1.38,1.33,1.19)}
      else if (iap <= .45) {qu=twodinterp(iap,tc,.40,.45,.6,.8,1.38,1.15,1.19,0.98)}
      else if (iap <= .50) {qu=twodinterp(iap,tc,.45,.50,.6,.8,1.15,0.95,0.98,0.79)}
      else {qu=twodinterp(iap,tc,.45,.50,.6,.8,1.15,0.95,0.98,0.79)}
    }
    else if (tc <= 1) {
      if (iap <= .30) {qu=twodinterp(iap,tc,.10,.30,.8,1,1.70,1.49,1.50,1.35)}
      else if (iap <= .35) {qu=twodinterp(iap,tc,.30,.35,.8,1,1.49,1.33,1.35,1.20)}
      else if (iap <= .40) {qu=twodinterp(iap,tc,.35,.40,.8,1,1.33,1.19,1.20,1.03)}
      else if (iap <= .45) {qu=twodinterp(iap,tc,.40,.45,.8,1,1.19,0.98,1.03,0.88)}
      else if (iap <= .50) {qu=twodinterp(iap,tc,.45,.50,.8,1,0.98,0.79,0.88,0.70)}
      else {qu=twodinterp(iap,tc,.45,.50,.8,1,0.98,0.79,0.88,0.70)}
    }
    else if (tc <= 2) {
      if (iap <= .30) {qu=twodinterp(iap,tc,.10,.30,1,2,1.50,1.35,1.00,0.80)}
      else if (iap <= .35) {qu=twodinterp(iap,tc,.30,.35,1,2,1.35,1.20,0.80,0.75)}
      else if (iap <= .40) {qu=twodinterp(iap,tc,.35,.40,1,2,1.20,1.03,0.75,0.66)}
      else if (iap <= .45) {qu=twodinterp(iap,tc,.40,.45,1,2,1.03,0.88,0.66,0.56)}
      else if (iap <= .50) {qu=twodinterp(iap,tc,.45,.50,1,2,0.88,0.70,0.56,0.48)}
      else {qu=twodinterp(iap,tc,.45,.50,1,2,0.88,0.70,0.56,0.48)}
    }
    else if (tc <= 4) {
      if (iap <= .30) {qu=twodinterp(iap,tc,.10,.30,2,4,1.00,0.80,0.58,0.47)}
      else if (iap <= .35) {qu=twodinterp(iap,tc,.30,.35,2,4,0.80,0.75,0.47,0.45)}
      else if (iap <= .40) {qu=twodinterp(iap,tc,.35,.40,2,4,0.75,0.66,0.45,0.43)}
      else if (iap <= .45) {qu=twodinterp(iap,tc,.40,.45,2,4,0.66,0.56,0.43,0.38)}
      else if (iap <= .50) {qu=twodinterp(iap,tc,.45,.50,2,4,0.56,0.48,0.38,0.35)}
      else {qu=twodinterp(iap,tc,.45,.50,2,4,0.56,0.48,0.38,0.35)}
    }
    else if (tc <= 6) {
      if (iap <= .30) {qu=twodinterp(iap,tc,.10,.30,4,6,0.58,0.47,0.42,0.36)}
      else if (iap <= .35) {qu=twodinterp(iap,tc,.30,.35,4,6,0.47,0.45,0.36,0.35)}
      else if (iap <= .40) {qu=twodinterp(iap,tc,.35,.40,4,6,0.45,0.425,0.35,0.33)}
      else if (iap <= .45) {qu=twodinterp(iap,tc,.40,.45,4,6,0.425,0.38,0.33,0.30)}
      else if (iap <= .50) {qu=twodinterp(iap,tc,.45,.50,4,6,0.38,0.35,0.30,0.28)}
      else {qu=twodinterp(iap,tc,.45,.50,4,6,0.38,0.35,0.30,0.28)}
    }
    else if (tc <= 8) {
      if (iap <= .30) {qu=twodinterp(iap,tc,.10,.30,6,8,0.42,0.36,0.325,0.28)}
      else if (iap <= .35) {qu=twodinterp(iap,tc,.30,.35,6,8,0.36,0.35,0.28,0.27)}
      else if (iap <= .40) {qu=twodinterp(iap,tc,.35,.40,6,8,0.35,0.33,0.27,0.26)}
      else if (iap <= .45) {qu=twodinterp(iap,tc,.40,.45,6,8,0.33,0.30,0.26,0.25)}
      else if (iap <= .50) {qu=twodinterp(iap,tc,.45,.50,6,8,0.30,0.28,0.25,0.24)}
      else {qu=twodinterp(iap,tc,.45,.50,6,8,0.30,0.28,0.25,0.24)}
    }
    else if (tc <= 10) {
      if (iap <= .30) {qu=twodinterp(iap,tc,.10,.30,8,10,0.325,0.275,0.255,0.235)}
      else if (iap <= .35) {qu=twodinterp(iap,tc,.30,.35,8,10,0.275,0.27,0.235,0.23)}
      else if (iap <= .40) {qu=twodinterp(iap,tc,.35,.40,8,10,0.27,0.26,0.23,0.225)}
      else if (iap <= .45) {qu=twodinterp(iap,tc,.40,.45,8,10,0.26,0.25,0.225,0.22)}
      else if (iap <= .50) {qu=twodinterp(iap,tc,.45,.50,8,10,0.25,0.24,0.22,0.215)}
      else {qu=twodinterp(iap,tc,.45,.50,8,10,0.25,0.24,0.22,0.215)}
    }
    else {qu=''}		// if (tc <= 10) ...
  }
  else {
    ClearResults()
  }
  document.PeakFlow.qu.value = qu
  if (isNumber(qu) && qu.toFixed(2)) {
    document.PeakFlow.qu.value = qu.toFixed(2)
  }
  if (qu<0) {ClearResults(); document.PeakFlow.qu.value = ''}
}

function Calc_q() {
  var qu = document.PeakFlow.qu.value/1000	// qu = unit peak flow rate (cu m/s per ha per mm of runoff)
  var A  = document.PeakFlow.A.value		// A  = watershed area (ha)
  var Q  = document.PeakFlow.Q.value		// Q = runoff depth from a 24-h storm of the desired period (mm)
  var Fp = document.PeakFlow.Fp.value		// pond and swamp adjustment factor
  q = ''
  if (isNumber(qu) && isNumber(A) && isNumber(Q)) {
    q  = qu * A * Q * Fp			// peak runoff rate (cu m/s); equation 5.11
  }
  document.PeakFlow.q.value = q			// alert(q)
  if (isNumber(q) && q.toFixed(2)) {
    document.PeakFlow.q.value = q.toFixed(2)
  }
}

function Calc_D() {				// type:   for a culvert gradient > ~5%
  var q = document.PeakFlow.q.value		// q  = peak flow rate (m^3 s^-1)
  var Sg = document.PeakFlow.Sg.value		// Sg = average watershed gradient
  var h  = document.PeakFlow.h_.value		// h  = distance center of culvert to 1 ft below road surface (ft) [1..60] *
  var g = 32.2					// g  = acceleration due to gravity
  var pi = 3.1415926				// pi = pi
//  var h  = 2					// h  = distance center of culvert to 1 ft below road surface (ft) [1..60] *
  if (isNumber(q)) {
    q = q * 35.31				// cubic meters per second to cubic feet per second
  }
  if (isNumber(q) && isNumber(Sg) && Sg > .05 && isNumber(h) && h>1 && h<60) {
    var num = 8 * q
    var den = pi * Math.sqrt(2*g*h)
    D = 12 * Math.sqrt(num / den)
  }
  else {
    D = ''
    ClearResults()
  }
  document.PeakFlow.D.value = D
  if (isNumber(D) && D.toFixed(2)) {
    document.PeakFlow.D_.value = D.toFixed(2)
    D = D * 2.54
    document.PeakFlow.D.value = D.toFixed(2)
  }
  else {}
}

function twodinterp(x,y,xl,xh,yl,yh,zll,zlr,zul,zur) {
  var xrat = (x-xl)/(xh-xl)
  var yrat = (y-yl)/(yh-yl)
  var yyl  = zll+(zul-zll)*yrat
  var yyr  = zlr+(zur-zlr)*yrat
  var xx   = yyl+(yyr-yyl)*xrat
  return xx
}

function isNumber(inputVal) {		//From JavaScript Handbook (Goodman) p. 374.
  if (inputVal == '') {return false}
  oneDecimal = false
  inputStr = "" + (inputVal+0)
  for (var i = 0; i < inputStr.length; i++) {
    var oneChar = inputStr.charAt(i)
    if (i == 0 && oneChar == "-") {
      continue
    }
    if (oneChar == "." && !oneDecimal) {
      oneDecimal = true
      continue
    }
    if (oneChar < "0" || oneChar > "9") {
      return false
    }
  }
  return true
}

function example() {
  document.PeakFlow.desc.value='Severe wildfire in a watershed in the Mica Creek Experimental Forest, Northern Idaho'
  document.PeakFlow.Q.value=26.5
  document.PeakFlow.P.value=49.3
  document.PeakFlow.L.value=2572
  document.PeakFlow.A.value=575
  document.PeakFlow.Sg.value=0.133
  document.PeakFlow.Tc.value=10
  document.PeakFlow.CN.value=90
  document.PeakFlow.Fp.value=1
  document.PeakFlow.h.value=1.83
  Calculate_SI()
}

function referenceBubbler() {
  var referencebub = document.getElementById('referenceBubble');
  b = referencebub.style;
  var vis = b.display;
  if (b.display != 'none') {b.display='none'}
  else {b.display=''};
}

function methodBubbler() {
  var methodbub = document.getElementById('methodBubble');
  b = methodbub.style;
  var vis = b.display;
  if (b.display != 'none') {b.display='none'}
  else {b.display=''};
}

function CNbubbler() {
  var CNbub = document.getElementById('CNbubble');
  b = CNbub.style;
  var vis = b.display;
  if (b.display != 'none') {b.display='none'}
  else {b.display=''};
}

function CNbubbler2() {
  var CNbub = document.getElementById('CNbubble');
  b = CNbub.style;
  var vis = b.visibility;
  if (b.visibility == '') {b.visibility='hidden';b.height=0}
  else {b.visibility=''};
}

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
//
// function showBubble and subordinates
//   (hideBubble,
//   is_right_available,
//   is_top_available,
//   is_bot_available,
//   is_left_available)
// are licensed under the terms of the GNU General Public License as published by the Free Software Foundation.
// e.g.
// https://www.milliondollarscript.com/trac/browser/branches/3.0/include/area_map_functions.php?rev=19
//
// These subroutines are free software; you can redistribute them and/or modify
//  them under the terms of the GNU General Public License as published by
//  the Free Software Foundation; either version 3 of the License, or (at your option) any later version.
//
////////////////////////////////////////////////////////////////////////

function hideBubble(e) {	// showBubble, hideBubble and allies used under a GNU license.
  var bubble = document.getElementById('bubble');
  b = bubble.style;
  b.visibility='hidden';
}

function is_right_available(box,e) {
  if ((box.clientWidth+e.clientX+h_padding)>=winWidth){
    return false; 	// not available
  }
  return true;
}

function is_top_available(box,e) {
  if ((e.clientY-box.clientHeight-v_padding) < 0){
    return false;
  }
  return true;
}

function is_bot_available(box,e) {
  if ((e.clientY+box.clientHeight+v_padding) > winHeight){
    return false;
  }
  return true;
}

function is_left_available(box,e) {
  if ((e.clientX-box.clientWidth-h_padding)<0){
    return false;
  }
  return true;
}

function  showBubble(e, str, area) {
  var relTarg;
  var bubble = document.getElementById('bubble');
  if (!e) var e = window.event;
  if (e.relatedTarget) relTarg = e.relatedTarget;
  else if (e.fromElement) relTarg = e.fromElement;

  var posRefX, posRefY = 0;
  posRefX= ((e.pageX && !e.clientX) ? e.pageX : e.clientX + document.body.scrollLeft);
  posRefY= ((e.pageY && !e.clientY) ? e.pagey : e.clientY + document.body.scrollTop);

  b = bubble.style

  document.getElementById('bubble').innerHTML=str;

  var mytop   = is_top_available(bubble,e);
  var mybot   = is_bot_available(bubble, e);
  var myright = is_right_available(bubble,e);
  var myleft  = is_left_available(bubble,e);
  if (mytop) {		 		 // move to the top
    bubble.ypos=posRefY-bubble.clientHeight-v_padding;
  }
  if (myright) {		  	// move to the right
    bubble.xpos=posRefX+h_padding;
  }
  if (myleft) {		 		 // move to the left
    bubble.xpos=posRefX-bubble.clientWidth-h_padding ;
  }
  if (mybot) {		 		 // move to the bottom
    bubble.ypos=posRefY+v_padding;
  }
  b.visibility='visible';
}
