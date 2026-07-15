
<!--

   var units = 'ft'

var otx1 = parseFloat( 29.90)
var otx2 = parseFloat( 37.07)
var otx3 = parseFloat( 42.54)
var otx4 = parseFloat( 51.46)
var otx5 = parseFloat( 62.48)
var otx6 = parseFloat( 70.38)
var otx7 = parseFloat( 82.52)
var otx8 = parseFloat( 81.81)
var otx9 = parseFloat( 71.98)
var otx10 = parseFloat( 59.34)
var otx11 = parseFloat( 41.19)
var otx12 = parseFloat( 31.32)

var otn1 = parseFloat(  4.83)
var otn2 = parseFloat(  7.98)
var otn3 = parseFloat( 12.06)
var otn4 = parseFloat( 21.11)
var otn5 = parseFloat( 28.46)
var otn6 = parseFloat( 35.05)
var otn7 = parseFloat( 38.77)
var otn8 = parseFloat( 36.76)
var otn9 = parseFloat( 31.03)
var otn10 = parseFloat( 25.65)
var otn11 = parseFloat( 17.86)
var otn12 = parseFloat(  9.14)

var opc1 = parseFloat(5.00)
var opc2 = parseFloat(3.67)
var opc3 = parseFloat(3.42)
var opc4 = parseFloat(1.89)
var opc5 = parseFloat(1.84)
var opc6 = parseFloat(1.94)
var opc7 = parseFloat(0.52)
var opc8 = parseFloat(0.69)
var opc9 = parseFloat(1.01)
var opc10 = parseFloat(2.21)
var opc11 = parseFloat(3.54)
var opc12 = parseFloat(5.35)
var spc = 31.08

var onw1 = parseFloat(14.71)
var onw2 = parseFloat(12.25)
var onw3 = parseFloat(12.68)
var onw4 = parseFloat(9.43)
var onw5 = parseFloat(9.69)
var onw6 = parseFloat(9.23)
var onw7 = parseFloat(2.89)
var onw8 = parseFloat(3.82)
var onw9 = parseFloat(5.62)
var onw10 = parseFloat(8.50)
var onw11 = parseFloat(11.05)
var onw12 = parseFloat(13.72)
var snw = 113.59

opww = new MakeArray(12)
opww[1] = parseFloat(.69)
opww[2] = parseFloat(.64)
opww[3] = parseFloat(.61)
opww[4] = parseFloat(.52)
opww[5] = parseFloat(.56)
opww[6] = parseFloat(.55)
opww[7] = parseFloat(.32)
opww[8] = parseFloat(.36)
opww[9] = parseFloat(.48)
opww[10] = parseFloat(.55)
opww[11] = parseFloat(.64)
opww[12] = parseFloat(.66)

opwd = new MakeArray(12)
opwd[1] = parseFloat(.28)
opwd[2] = parseFloat(.28)
opwd[3] = parseFloat(.27)
opwd[4] = parseFloat(.22)
opwd[5] = parseFloat(.20)
opwd[6] = parseFloat(.20)
opwd[7] = parseFloat(.07)
opwd[8] = parseFloat(.09)
opwd[9] = parseFloat(.12)
opwd[10] = parseFloat(.17)
opwd[11] = parseFloat(.21)
opwd[12] = parseFloat(.27)

daymo = new MakeArray(12)
daymo[1]=31; daymo[2]=28; daymo[3]=31; daymo[4]=30; daymo[5]=31; daymo[6]=30;
daymo[7]=31; daymo[8]=31; daymo[9]=30; daymo[10]=31; daymo[11]=30; daymo[12]=31;

function MakeArray(n) {
  this.length=n
  return this
}

function nwpct() {
  var ratio = 1+parseFloat(document.mods.nwp.value)*0.01
  document.mods.nw1.value = precision(onw1 * ratio,2); mod_nw(1)
  document.mods.nw2.value = precision(onw2 * ratio,2); mod_nw(2)
  document.mods.nw3.value = precision(onw3 * ratio,2); mod_nw(3)
  document.mods.nw4.value = precision(onw4 * ratio,2); mod_nw(4)
  document.mods.nw5.value = precision(onw5 * ratio,2); mod_nw(5)
  document.mods.nw6.value = precision(onw6 * ratio,2); mod_nw(6)
  document.mods.nw7.value = precision(onw7 * ratio,2); mod_nw(7)
  document.mods.nw8.value = precision(onw8 * ratio,2); mod_nw(8)
  document.mods.nw9.value = precision(onw9 * ratio,2); mod_nw(9)
  document.mods.nw10.value = precision(onw10 * ratio,2); mod_nw(10)
  document.mods.nw11.value = precision(onw11 * ratio,2); mod_nw(11)
  document.mods.nw12.value = precision(onw12 * ratio,2); mod_nw(12)
//   sum_nw()
}

function pcpct() {
  var ratio = 1+parseFloat(document.mods.pcp.value)*0.01
  document.mods.pc1.value = precision(opc1 * ratio,2)
  document.mods.pc2.value = precision(opc2 * ratio,2)
  document.mods.pc3.value = precision(opc3 * ratio,2)
  document.mods.pc4.value = precision(opc4 * ratio,2)
  document.mods.pc5.value = precision(opc5 * ratio,2)
  document.mods.pc6.value = precision(opc6 * ratio,2)
  document.mods.pc7.value = precision(opc7 * ratio,2)
  document.mods.pc8.value = precision(opc8 * ratio,2)
  document.mods.pc9.value = precision(opc9 * ratio,2)
  document.mods.pc10.value = precision(opc10 * ratio,2)
  document.mods.pc11.value = precision(opc11 * ratio,2)
  document.mods.pc12.value = precision(opc12 * ratio,2)
  sum_pc()
}

function tndeg() {
  var tndiff = parseFloat(document.mods.tnd.value)
  document.mods.tn1.value = precision(otn1 + tndiff,2)
  document.mods.tn2.value = precision(otn2 + tndiff,2)
  document.mods.tn3.value = precision(otn3 + tndiff,2)
  document.mods.tn4.value = precision(otn4 + tndiff,2)
  document.mods.tn5.value = precision(otn5 + tndiff,2)
  document.mods.tn6.value = precision(otn6 + tndiff,2)
  document.mods.tn7.value = precision(otn7 + tndiff,2)
  document.mods.tn8.value = precision(otn8 + tndiff,2)
  document.mods.tn9.value = precision(otn9 + tndiff,2)
  document.mods.tn10.value = precision(otn10 + tndiff,2)
  document.mods.tn11.value = precision(otn11 + tndiff,2)
  document.mods.tn12.value = precision(otn12 + tndiff,2)
}

function txdeg() {
  var txdiff = parseFloat(document.mods.txd.value)
  document.mods.tx1.value = precision(otx1 + txdiff,2)
  document.mods.tx2.value = precision(otx2 + txdiff,2)
  document.mods.tx3.value = precision(otx3 + txdiff,2)
  document.mods.tx4.value = precision(otx4 + txdiff,2)
  document.mods.tx5.value = precision(otx5 + txdiff,2)
  document.mods.tx6.value = precision(otx6 + txdiff,2)
  document.mods.tx7.value = precision(otx7 + txdiff,2)
  document.mods.tx8.value = precision(otx8 + txdiff,2)
  document.mods.tx9.value = precision(otx9 + txdiff,2)
  document.mods.tx10.value = precision(otx10 + txdiff,2)
  document.mods.tx11.value = precision(otx11 + txdiff,2)
  document.mods.tx12.value = precision(otx12 + txdiff,2)
}

function tnpct() {
  var ratio = 1+parseFloat(document.mods.tnp.value)*0.01
  document.mods.tn1.value = precision(otn1 * ratio,2)
  document.mods.tn2.value = precision(otn2 * ratio,2)
  document.mods.tn3.value = precision(otn3 * ratio,2)
  document.mods.tn4.value = precision(otn4 * ratio,2)
  document.mods.tn5.value = precision(otn5 * ratio,2)
  document.mods.tn6.value = precision(otn6 * ratio,2)
  document.mods.tn7.value = precision(otn7 * ratio,2)
  document.mods.tn8.value = precision(otn8 * ratio,2)
  document.mods.tn9.value = precision(otn9 * ratio,2)
  document.mods.tn10.value = precision(otn10 * ratio,2)
  document.mods.tn11.value = precision(otn11 * ratio,2)
  document.mods.tn12.value = precision(otn12 * ratio,2)
}

function txpct() {
  var ratio = 1+parseFloat(document.mods.txp.value)*0.01
  document.mods.tx1.value = precision(otx1 * ratio,2)
  document.mods.tx2.value = precision(otx2 * ratio,2)
  document.mods.tx3.value = precision(otx3 * ratio,2)
  document.mods.tx4.value = precision(otx4 * ratio,2)
  document.mods.tx5.value = precision(otx5 * ratio,2)
  document.mods.tx6.value = precision(otx6 * ratio,2)
  document.mods.tx7.value = precision(otx7 * ratio,2)
  document.mods.tx8.value = precision(otx8 * ratio,2)
  document.mods.tx9.value = precision(otx9 * ratio,2)
  document.mods.tx10.value = precision(otx10 * ratio,2)
  document.mods.tx11.value = precision(otx11 * ratio,2)
  document.mods.tx12.value = precision(otx12 * ratio,2)
}

function distribute_wet() {
  // new_value = (old_value/old_sum) * new_sum
  var ratio = document.mods.nw.value / snw
  document.mods.nw1.value = precision(onw1 * ratio,2); mod_nw(1)
  document.mods.nw2.value = precision(onw2 * ratio,2); mod_nw(2)
  document.mods.nw3.value = precision(onw3 * ratio,2); mod_nw(3)
  document.mods.nw4.value = precision(onw4 * ratio,2); mod_nw(4)
  document.mods.nw5.value = precision(onw5 * ratio,2); mod_nw(5)
  document.mods.nw6.value = precision(onw6 * ratio,2); mod_nw(6)
  document.mods.nw7.value = precision(onw7 * ratio,2); mod_nw(7)
  document.mods.nw8.value = precision(onw8 * ratio,2); mod_nw(8)
  document.mods.nw9.value = precision(onw9 * ratio,2); mod_nw(9)
  document.mods.nw10.value = precision(onw10 * ratio,2); mod_nw(10)
  document.mods.nw11.value = precision(onw11 * ratio,2); mod_nw(11)
  document.mods.nw12.value = precision(onw12 * ratio,2); mod_nw(12)
//  alert ('snw = ' + snw)
//  alert ('nwp = ' + document.mods.nw.value)
  document.mods.nwp.value=precision((document.mods.nw.value-snw)/snw*100,2)       // ***********
}

function distribute_pcp() {
  // new_value = (old_value/old_sum) * new_sum
  var ratio = document.mods.pc.value / spc
  document.mods.pc1.value = precision(opc1 * ratio,2)
  document.mods.pc2.value = precision(opc2 * ratio,2)
  document.mods.pc3.value = precision(opc3 * ratio,2)
  document.mods.pc4.value = precision(opc4 * ratio,2)
  document.mods.pc5.value = precision(opc5 * ratio,2)
  document.mods.pc6.value = precision(opc6 * ratio,2)
  document.mods.pc7.value = precision(opc7 * ratio,2)
  document.mods.pc8.value = precision(opc8 * ratio,2)
  document.mods.pc9.value = precision(opc9 * ratio,2)
  document.mods.pc10.value = precision(opc10 * ratio,2)
  document.mods.pc11.value = precision(opc11 * ratio,2)
  document.mods.pc12.value = precision(opc12 * ratio,2)
  document.mods.pcp.value = precision((document.mods.pc.value-spc)/spc*100,2)
}

function mod_nw(i) {
  // check valid number first

  if (i == 1)  {nw_ary=document.mods.nw1.value};  if (i == 2)  {nw_ary=document.mods.nw2.value}
  if (i == 3)  {nw_ary=document.mods.nw3.value};  if (i == 4)  {nw_ary=document.mods.nw4.value}
  if (i == 5)  {nw_ary=document.mods.nw5.value};  if (i == 6)  {nw_ary=document.mods.nw6.value}
  if (i == 7)  {nw_ary=document.mods.nw7.value};  if (i == 8)  {nw_ary=document.mods.nw8.value}
  if (i == 9)  {nw_ary=document.mods.nw9.value};  if (i == 10) {nw_ary=document.mods.nw10.value}
  if (i == 11) {nw_ary=document.mods.nw11.value}; if (i == 12) {nw_ary=document.mods.nw12.value}

//  if (nw_ary > daymo[i]) {nw_ary = daymo[i]}           // should set form value as well
//  if (nw_ary < 0) {nw_ary = 0}
  fix_nw()

  var pww = parseFloat(opww[i])				// if (pww < 0.001) pww =
  if (pww < 0.001) pww = 0.001				// 2010.11.18
  var pwd = parseFloat(opwd[i])
  var ratio = pwd / pww                 			// pww can be zero ...
//  alert ('pww='+pww +'pwd= ' + pwd + 'ratio= ' + ratio)
  var pw = parseFloat(nw_ary) / daymo[i]
  if (pw < 0.001) pw = 0.01				// 2010.11.18
  var pww = 1 / (1 - ratio + (ratio / pw))			// can ratio + (ratio / pw) == 1 ?
  var pwd = pww * ratio
  pww_ary=pww
  pwd_ary=pww*ratio
//  alert ('pww='+pww +'pwd= ' + pwd + 'ratio= ' + ratio)
  if (i == 1)  {document.mods.pww1.value=precision(pww_ary,2); document.mods.pwd1.value=precision(pwd_ary,2)}
  if (i == 2)  {document.mods.pww2.value=precision(pww_ary,2); document.mods.pwd2.value=precision(pwd_ary,2)}
  if (i == 3)  {document.mods.pww3.value=precision(pww_ary,2); document.mods.pwd3.value=precision(pwd_ary,2)}
  if (i == 4)  {document.mods.pww4.value=precision(pww_ary,2); document.mods.pwd4.value=precision(pwd_ary,2)}
  if (i == 5)  {document.mods.pww5.value=precision(pww_ary,2); document.mods.pwd5.value=precision(pwd_ary,2)}
  if (i == 6)  {document.mods.pww6.value=precision(pww_ary,2); document.mods.pwd6.value=precision(pwd_ary,2)}
  if (i == 7)  {document.mods.pww7.value=precision(pww_ary,2); document.mods.pwd7.value=precision(pwd_ary,2)}
  if (i == 8)  {document.mods.pww8.value=precision(pww_ary,2); document.mods.pwd8.value=precision(pwd_ary,2)}
  if (i == 9)  {document.mods.pww9.value=precision(pww_ary,2); document.mods.pwd9.value=precision(pwd_ary,2)}
  if (i == 10) {document.mods.pww10.value=precision(pww_ary,2); document.mods.pwd10.value=precision(pwd_ary,2)}
  if (i == 11) {document.mods.pww11.value=precision(pww_ary,2); document.mods.pwd11.value=precision(pwd_ary,2)}
  if (i == 12) {document.mods.pww12.value=precision(pww_ary,2); document.mods.pwd12.value=precision(pwd_ary,2)}
  sum_nw()
}

function fix_nw() {
  if (isNumber(document.mods.nw1.value)) {
    if (document.mods.nw1.value > daymo[1]){document.mods.nw1.value=daymo[1]}
    if (document.mods.nw1.value < 0) {document.mods.nw1.value=0}
  } else { document.mods.nw1.value=0 }
  if (isNumber(document.mods.nw2.value)) {
    if (document.mods.nw2.value > daymo[2]){document.mods.nw2.value=daymo[2]}
    if (document.mods.nw2.value < 0) {document.mods.nw2.value=0}
  } else { document.mods.nw2.value=0 }
  if (isNumber(document.mods.nw3.value)) {
    if (document.mods.nw3.value > daymo[3]){document.mods.nw3.value=daymo[3]}
    if (document.mods.nw3.value < 0) {document.mods.nw3.value=0}
  } else { document.mods.nw3.value=0 }
  if (isNumber(document.mods.nw4.value)) {
    if (document.mods.nw4.value > daymo[4]){document.mods.nw4.value=daymo[4]}
    if (document.mods.nw4.value < 0) {document.mods.nw4.value=0}
  } else { document.mods.nw4.value=0 }
  if (isNumber(document.mods.nw5.value)) {
    if (document.mods.nw5.value > daymo[5]){document.mods.nw5.value=daymo[5]}
    if (document.mods.nw5.value < 0) {document.mods.nw5.value=0}
  } else { document.mods.nw5.value=0 }
  if (isNumber(document.mods.nw6.value)) {
    if (document.mods.nw6.value > daymo[6]){document.mods.nw6.value=daymo[6]}
    if (document.mods.nw6.value < 0) {document.mods.nw6.value=0}
  } else { document.mods.nw6.value=0 }
  if (isNumber(document.mods.nw7.value)) {
    if (document.mods.nw7.value > daymo[7]){document.mods.nw7.value=daymo[7]}
    if (document.mods.nw7.value < 0) {document.mods.nw7.value=0}
  } else { document.mods.nw7.value=0 }
  if (isNumber(document.mods.nw8.value)) {
    if (document.mods.nw8.value > daymo[8]){document.mods.nw8.value=daymo[8]}
    if (document.mods.nw8.value < 0) {document.mods.nw8.value=0}
  } else { document.mods.nw8.value=0 }
  if (isNumber(document.mods.nw9.value)) {
    if (document.mods.nw9.value > daymo[9]){document.mods.nw9.value=daymo[9]}
    if (document.mods.nw9.value < 0) {document.mods.nw9.value=0}
  } else { document.mods.nw9.value=0 }
  if (isNumber(document.mods.nw10.value)) {
    if (document.mods.nw10.value > daymo[10]){document.mods.nw10.value=daymo[10]}
    if (document.mods.nw10.value < 0) {document.mods.nw10.value=0}
  } else { document.mods.nw10.value=0 }
  if (isNumber(document.mods.nw11.value)) {
    if (document.mods.nw11.value > daymo[11]){document.mods.nw11.value=daymo[11]}
    if (document.mods.nw11.value < 0) {document.mods.nw11.value=0}
  } else { document.mods.nw11.value=0 }
  if (isNumber(document.mods.nw12.value)) {
    if (document.mods.nw12.value > daymo[12]){document.mods.nw12.value=daymo[12]}
    if (document.mods.nw12.value < 0) {document.mods.nw12.value=0}
  } else { document.mods.nw12.value=0 }
}

function sum_nw() {
// check valid number first
  document.mods.nw.value=precision(
    parseFloat(document.mods.nw1.value)+
    parseFloat(document.mods.nw2.value)+
    parseFloat(document.mods.nw3.value)+
    parseFloat(document.mods.nw4.value)+
    parseFloat(document.mods.nw5.value)+
    parseFloat(document.mods.nw6.value)+
    parseFloat(document.mods.nw7.value)+
    parseFloat(document.mods.nw8.value)+
    parseFloat(document.mods.nw9.value)+
    parseFloat(document.mods.nw10.value)+
    parseFloat(document.mods.nw11.value)+
    parseFloat(document.mods.nw12.value),2)
}

function mod_tmp(obj) {

  def = 0;
  min = -50;
  max = 130;
  var tmp_unit = ' deg F';
  if (units == 'm') {
    min = -200
    max = 200;
    pc_unit = ' deg C'
  }

  if (isNumber(obj.value)) {
    if (obj.value < min){
      alert('Temperature must be between ' + min + ' and ' + max + tmp_unit)
      obj.value=min
    }
    if (obj.value > max) {
      alert('Temperature must be between ' + min + ' and ' + max + tmp_unit)
      obj.value=max
    }
  } else {
    alert('Invalid entry of ' + obj.value + ' for Temperature!')
    obj.value=def
  }
}

function mod_pc(obj) {
// check valid number first

  def = 0;
  min = 0;
  max = 39;
  pc_unit = ' in';
  if (units == 'm') {
    max = 999;
    pc_unit = ' mm'
  }

  if (isNumber(obj.value)) {
    if (obj.value < min){
      alert('Precipitation must be between ' + min + ' and ' + max + pc_unit)
      obj.value=min
    }
    if (obj.value > max) {
      alert('Precipitation must be between ' + min + ' and ' + max + pc_unit)
      obj.value=max
    }
  } else {
    alert('Invalid entry for precipitation!')
    obj.value=def
  }
  sum_pc()
}

function sum_pc() {
  document.mods.pc.value=precision(
    parseFloat(document.mods.pc1.value)+
    parseFloat(document.mods.pc2.value)+
    parseFloat(document.mods.pc3.value)+
    parseFloat(document.mods.pc4.value)+
    parseFloat(document.mods.pc5.value)+
    parseFloat(document.mods.pc6.value)+
    parseFloat(document.mods.pc7.value)+
    parseFloat(document.mods.pc8.value)+
    parseFloat(document.mods.pc9.value)+
    parseFloat(document.mods.pc10.value)+
    parseFloat(document.mods.pc11.value)+
    parseFloat(document.mods.pc12.value),2)
}

function updateLL() {
// alert('updating lat long');			// DEH 2014.12.02
  document.mods.latitude.value=document.prism.platitude.value
  document.mods.longitude.value=document.prism.plongitude.value
}

function precision(floater,ndec) {
  ndec=parseInt(ndec)
  factor=Math.pow(10,ndec)
  return Math.round(floater*factor)/factor
}

function isNumber(inputVal) {
  // Determine whether a suspected numeric input
  // is a positive or negative number.
  // Ref.: JavaScript Handbook. Danny Goodman. listing 15-4, p. 374.
  oneDecimal = false                              // no dots yet
  inputStr = '' + inputVal                        // force to string
  for (var i = 0; i < inputStr.length; i++) {     // step through each char
    var oneChar = inputStr.charAt(i)              // get one char out
    if (i == 0 && oneChar == '-') {               // negative OK at char 0
      continue
    }
    if (oneChar == '.' && !oneDecimal) {
      oneDecimal = true
      continue
    }
    if (oneChar < '0' || oneChar > '9') {
      return false
    }
  }
  return true
}

function lapsetemp() {
  if (document.mods.lapse.checked) {
    var selev = 5380/3.28
    var lelev = parseFloat(document.mods.ftelev.value)/3.28
    var maxlapse = -6.0 * ((selev-lelev)/1000) * (9.0/5.0)

    document.mods.tx1.value = precision(otx1 - maxlapse,2)
    document.mods.tx2.value = precision(otx2 - maxlapse,2)
    document.mods.tx3.value = precision(otx3 - maxlapse,2)
    document.mods.tx4.value = precision(otx4 - maxlapse,2)
    document.mods.tx5.value = precision(otx5 - maxlapse,2)
    document.mods.tx6.value = precision(otx6 - maxlapse,2)
    document.mods.tx7.value = precision(otx7 - maxlapse,2)
    document.mods.tx8.value = precision(otx8 - maxlapse,2)
    document.mods.tx9.value = precision(otx9 - maxlapse,2)
    document.mods.tx10.value = precision(otx10 - maxlapse,2)
    document.mods.tx11.value = precision(otx11 - maxlapse,2)
    document.mods.tx12.value = precision(otx12 - maxlapse,2)
    var lelev = parseFloat(document.mods.ftelev.value)/3.28
    var minlapse = -5.0 * ((selev-lelev)/1000) * (9.0/5.0)

    document.mods.tn1.value = precision(otn1 - minlapse,2)
    document.mods.tn2.value = precision(otn2 - minlapse,2)
    document.mods.tn3.value = precision(otn3 - minlapse,2)
    document.mods.tn4.value = precision(otn4 - minlapse,2)
    document.mods.tn5.value = precision(otn5 - minlapse,2)
    document.mods.tn6.value = precision(otn6 - minlapse,2)
    document.mods.tn7.value = precision(otn7 - minlapse,2)
    document.mods.tn8.value = precision(otn8 - minlapse,2)
    document.mods.tn9.value = precision(otn9 - minlapse,2)
    document.mods.tn10.value = precision(otn10 - minlapse,2)
    document.mods.tn11.value = precision(otn11 - minlapse,2)
    document.mods.tn12.value = precision(otn12 - minlapse,2)

  }
  else {
    document.mods.tx1.value = precision(otx1,2)
    document.mods.tx2.value = precision(otx2,2)
    document.mods.tx3.value = precision(otx3,2)
    document.mods.tx4.value = precision(otx4,2)
    document.mods.tx5.value = precision(otx5,2)
    document.mods.tx6.value = precision(otx6,2)
    document.mods.tx7.value = precision(otx7,2)
    document.mods.tx8.value = precision(otx8,2)
    document.mods.tx9.value = precision(otx9,2)
    document.mods.tx10.value = precision(otx10,2)
    document.mods.tx11.value = precision(otx11,2)
    document.mods.tx12.value = precision(otx12,2)
    document.mods.tn1.value = precision(otn1,2)
    document.mods.tn2.value = precision(otn2,2)
    document.mods.tn3.value = precision(otn3,2)
    document.mods.tn4.value = precision(otn4,2)
    document.mods.tn5.value = precision(otn5,2)
    document.mods.tn6.value = precision(otn6,2)
    document.mods.tn7.value = precision(otn7,2)
    document.mods.tn8.value = precision(otn8,2)
    document.mods.tn9.value = precision(otn9,2)
    document.mods.tn10.value = precision(otn10,2)
    document.mods.tn11.value = precision(otn11,2)
    document.mods.tn12.value = precision(otn12,2)
  }
}

var browserName=navigator.appName;
var browserVer=parseInt(navigator.appVersion);

function latlong_calc(unit) {

  var url='/fswepp/rc/milatcon.html';
  if (units == 'm') {url='/fswepp/rc/kmlatcon.html'}
  var title='lat-long_calculator';
  var params='toolbar=no,location=no,status=yes,directories=no,menubar=no,scrollbars=yes,resizable=yes,width=500,height=350';
  popupwindow=window.open(url,title,params);
//  if (browserName == 'Netscape' && browserVer >= 3) popupwindow.creator=window;
  if (popupwindow.creator=window) popupwindow.creator=window;
//  alert(obj);
//  valid_al();
}

function dms2dec_calc(unit) {

  var url='/fswepp/rc/dms2dec.html';
  var title='dms2dec_calculator';
  var params='toolbar=no,location=no,status=yes,directories=no,menubar=no,scrollbars=yes,resizable=yes,width=500,height=350';
  popupwindow=window.open(url,title,params);
//  if (browserName == 'Netscape' && browserVer >= 3) popupwindow.creator=window;
  if (popupwindow.creator=window) popupwindow.creator=window;
//  alert(obj);
//  valid_al();
}

// -->
