
export namespace Calendar {
    // Records

    // Function options
    /**
     * This file was automatically generated by json-schema-to-typescript.
     * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
     * and run json-schema-to-typescript to regenerate this file.
     */

    export interface CreateCalendarOptionalParameter {
      /**
       * the calendar new name
       */
      withName?: string;
    }


    /**
     * This file was automatically generated by json-schema-to-typescript.
     * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
     * and run json-schema-to-typescript to regenerate this file.
     */

    export interface SwitchViewOptionalParameter {
      /**
       * the calendar view to be displayed
       */
      to: any;
    }

    /**
     * This file was automatically generated by json-schema-to-typescript.
     * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
     * and run json-schema-to-typescript to regenerate this file.
     */

    export interface ViewCalendarOptionalParameter {
      /**
       * the date to be displayed
       */
      at: any;
    }



    /**
     * This file was automatically generated by json-schema-to-typescript.
     * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
     * and run json-schema-to-typescript to regenerate this file.
     */

    export interface MakeOptionalParameter {
      /**
       * The class of the new object.
       */
      new: any;
      /**
       * The location at which to insert the object.
       */
      at?: any;
      /**
       * The initial contents of the object.
       */
      withData?: any;
      /**
       * The initial values for properties of the object.
       */
      withProperties?: any;
    }


}
export interface Calendar {
    // Functions

     /**
      * Creates a new calendar (obsolete, will be removed in next release)

      * @param option
      * 
      */
     createCalendar(option?: Calendar.CreateCalendarOptionalParameter): void;

     /**
      * Tell the application to reload all calendar files contents

      * 
      */
     reloadCalendars(): void;

     /**
      * Show calendar on the given view

      * @param option
      * 
      */
     switchView(option?: Calendar.SwitchViewOptionalParameter): void;

     /**
      * Show calendar on the given date

      * @param option
      * 
      */
     viewCalendar(option?: Calendar.ViewCalendarOptionalParameter): void;

     /**
      * Subscribe to a remote calendar through a webcal or http URL
      * @param directParameter the iCal URL
      * 
      */
     getURL(directParameter: string, ): void;

     /**
      * Show the event or to-do in the calendar window
      * @param directParameter the item
      * 
      */
     show(directParameter: any, ): void;

     /**
      * undefined

      * @param option
      * @return The new object.
      */
     make(option?: Calendar.MakeOptionalParameter): any;

     /**
      * undefined

      * 
      */
     save(): void;
}