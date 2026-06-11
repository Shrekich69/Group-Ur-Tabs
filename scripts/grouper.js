"use strict"

class Group {
   collapsed = false;
   color = "";
   id = 0;
   title = "";

   excluded = false;
   extendable = true;
   domain = "";
   // amount of tabs
   amount = 0;
}

class Grouper {

   static groups = new Array(Group);

   /**
    * @returns {Object[]}
    */
   get groups() {
      return this.groups;
   }

   /**
    * @param {Object[]} tabs 
    */
   groupTabs(tabs) {

   }

}